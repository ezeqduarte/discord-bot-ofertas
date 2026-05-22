const { getLatestTweets } = require('./scraper');

(async () => {
  const tweets = await getLatestTweets('vmenditto');
  console.log(`Encontrados ${tweets.length} tweets:`);
  tweets.forEach(t => console.log(`- [${t.datetime}] ${t.text.substring(0, 80)}...`));
})();