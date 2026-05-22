require('dotenv').config();
const { createBrowserContext, getLatestTweets } = require('./scraper');
const { start, sendTweet, sendAlert } = require('./discord-bot');
const { getAllUsers, updateLastTweetId } = require('./storage');
const { setCheckSingleUser } = require('./commands');

const INTERVAL_MINUTES = 5;

const DELAY_BETWEEN_USERS_SEC = 8;

function delay(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function checkUserTweets(user, context, sendLatestIfNew = false) {
  console.log(`[${new Date().toISOString()}] Revisando @${user.username}...`);

  let tweets;
  try {
    tweets = await getLatestTweets(user.username, context);
  } catch (err) {
    if (err.code === 'SESSION_EXPIRED') {
      console.error(`[SESSION] Cookies de Twitter expiradas. El bot no puede scrapear.`);
      await sendAlert(
        user.channelId,
        '⚠️ **Las cookies de Twitter expiraron.** El bot dejó de funcionar. Actualizá `cookies.json` y reiniciá.'
      );
      process.exit(1);
    }
    throw err;
  }

  if (tweets.length === 0) {
    console.log(`  No se encontraron tweets de @${user.username}`);
    return;
  }

  // Primera vez para este usuario: mandar el último tweet como bienvenida
  if (!user.lastTweetId) {
    if (sendLatestIfNew) {
      console.log(`  Primer chequeo: enviando último tweet`);
      const latestTweet = tweets[0];
      const success = await sendTweet(user.channelId, latestTweet);
      if (success) {
        console.log(`  ✅ Enviado: ${latestTweet.text.substring(0, 50)}...`);
      }
    } else {
      console.log(`  Primera revisión, guardando estado inicial`);
    }
    updateLastTweetId(user.username, tweets[0].id);
    return;
  }

  const newTweets = tweets.filter(t => BigInt(t.id) > BigInt(user.lastTweetId));
  
  if (newTweets.length === 0) {
    console.log(`  Sin tweets nuevos de @${user.username}`);
    return;
  }

  console.log(`  ¡${newTweets.length} tweets nuevos de @${user.username}!`);

  for (const tweet of newTweets.reverse()) {
    const success = await sendTweet(user.channelId, tweet);
    if (success) {
      console.log(`  ✅ Enviado: ${tweet.text.substring(0, 50)}...`);
    } else {
      console.log(`  ❌ Falló: ${tweet.text.substring(0, 50)}...`);
    }
  }

  updateLastTweetId(user.username, tweets[0].id);
}

async function checkAllUsers() {
  const users = getAllUsers();

  if (users.length === 0) {
    console.log('No hay usuarios para monitorear. Usá /agregar en Discord.');
    return;
  }

  console.log(`\n=== Revisando ${users.length} usuario(s) ===`);

  const { browser, context } = await createBrowserContext();
  try {
    for (let i = 0; i < users.length; i++) {
      await checkUserTweets(users[i], context);

      if (i < users.length - 1) {
        await delay(DELAY_BETWEEN_USERS_SEC);
      }
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('Iniciando bot...');
  await start();
  
  await checkAllUsers();
  setInterval(checkAllUsers, INTERVAL_MINUTES * 60 * 1000);
}

async function checkSingleUser(username) {
  const users = getAllUsers();
  const user = users.find(u => u.username === username);
  if (!user) return;

  const { browser, context } = await createBrowserContext();
  try {
    await checkUserTweets(user, context, true);
  } finally {
    await browser.close();
  }
}

setCheckSingleUser(checkSingleUser);

module.exports = { checkAllUsers, checkSingleUser };

main().catch(console.error);