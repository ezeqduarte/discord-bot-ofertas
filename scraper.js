const { chromium } = require('playwright');
const fs = require('fs');

async function createBrowserContext() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const cookiesRaw = process.env.TWITTER_COOKIES;
  if (!cookiesRaw) throw new Error('La variable de entorno TWITTER_COOKIES no está definida.');
  const cookiesData = JSON.parse(cookiesRaw);
  const cookies = cookiesData.map(c => ({
    name: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path || '/',
    expires: c.expirationDate ? Math.floor(c.expirationDate) : -1,
    httpOnly: c.httpOnly || false,
    secure: c.secure || false,
    sameSite: c.sameSite === 'no_restriction' ? 'None' : (c.sameSite === 'lax' ? 'Lax' : 'Strict')
  }));
  await context.addCookies(cookies);

  return { browser, context };
}

async function getLatestTweets(username, context) {
  const page = await context.newPage();

  try {
    await page.goto(`https://x.com/${username}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const currentUrl = page.url();
    if (currentUrl.includes('/i/flow/login') || currentUrl.includes('login?') || currentUrl.includes('signin')) {
      const err = new Error('SESSION_EXPIRED');
      err.code = 'SESSION_EXPIRED';
      throw err;
    }

    await page.waitForSelector('article', { timeout: 15000 });

    const tweets = await page.evaluate(() => {
      const articles = document.querySelectorAll('article');
      const results = [];

      articles.forEach(article => {
        const isPinned = article.innerText.includes('Pinned') ||
          article.innerText.includes('Fijado') ||
          article.innerText.includes('Anclado');
        if (isPinned) return;

        const linkEl = article.querySelector('a[href*="/status/"]');
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const timeEl = article.querySelector('time');
        const imageEls = article.querySelectorAll('[data-testid="tweetPhoto"] img');
        const authorEl = article.querySelector('[data-testid="User-Name"]');

        const hasContent = textEl || imageEls.length > 0;
        if (linkEl && timeEl && hasContent) {
          const href = linkEl.getAttribute('href');
          const id = href.split('/status/')[1]?.split('/')[0];
          const text = textEl ? textEl.innerText : '';
          const datetime = timeEl.getAttribute('datetime');

          const imageUrls = Array.from(imageEls)
            .map(img => img.getAttribute('src'))
            .filter(Boolean);

          let authorName = 'Usuario';
          let authorHandle = '';
          if (authorEl) {
            const lines = authorEl.innerText.split('\n').filter(l => l.trim());
            authorName = lines[0] || 'Usuario';
            authorHandle = lines.find(l => l.startsWith('@')) || '';
          }

          if (id) {
            results.push({
              id,
              text,
              datetime,
              imageUrls,
              authorName,
              authorHandle,
              url: `https://x.com${href}`
            });
          }
        }
      });

      results.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
      return results;
    });

    return tweets;
  } catch (error) {
    if (error.code === 'SESSION_EXPIRED') throw error;
    console.error('Error scrapeando:', error.message);
    return [];
  } finally {
    await page.close();
  }
}

const SCRAPE_MAX_RETRIES = 2;
const SCRAPE_RETRY_DELAY_MS = 5000;

async function fetchTweetsWithRetry(username, context) {
  let lastError;
  for (let attempt = 1; attempt <= SCRAPE_MAX_RETRIES; attempt++) {
    try {
      return await getLatestTweets(username, context);
    } catch (err) {
      if (err.code === 'SESSION_EXPIRED') throw err;
      lastError = err;
      console.warn(`  [Intento ${attempt}/${SCRAPE_MAX_RETRIES}] Error scrapeando @${username}: ${err.message}`);
      if (attempt < SCRAPE_MAX_RETRIES) await new Promise(r => setTimeout(r, SCRAPE_RETRY_DELAY_MS));
    }
  }
  throw lastError;
}

module.exports = { createBrowserContext, getLatestTweets, fetchTweetsWithRetry };