require('dotenv').config();
const { getLatestTweets } = require('./scraper');
const { start, sendTweet } = require('./discord-bot');
const fs = require('fs');

const USERNAME = 'vmenditto';
const CHANNEL_ID = process.env.CHANNEL_ID;
const INTERVAL_MINUTES = 5;

function loadStorage() {
  return JSON.parse(fs.readFileSync('./storage.json', 'utf8'));
}

function saveStorage(data) {
  fs.writeFileSync('./storage.json', JSON.stringify(data, null, 2));
}

async function checkNewTweets() {
  console.log(`[${new Date().toISOString()}] Revisando tweets...`);
  
  const tweets = await getLatestTweets(USERNAME);
  if (tweets.length === 0) {
    console.log('No se encontraron tweets');
    return;
  }

  const storage = loadStorage();
  const lastSeenId = storage.lastTweetId;

  // Si es la primera ejecución, solo guardamos el último ID sin notificar
  if (!lastSeenId) {
    console.log('Primera ejecución, guardando estado inicial');
    saveStorage({ lastTweetId: tweets[0].id });
    return;
  }

  // Filtrar tweets nuevos (los que tienen ID mayor al último visto)
  const newTweets = tweets.filter(t => BigInt(t.id) > BigInt(lastSeenId));
  
  if (newTweets.length === 0) {
    console.log('Sin tweets nuevos');
    return;
  }

  console.log(`¡${newTweets.length} tweets nuevos!`);

  // Enviar de más viejo a más nuevo
  for (const tweet of newTweets.reverse()) {
    await sendTweet(CHANNEL_ID, tweet);
    console.log(`Enviado: ${tweet.text.substring(0, 50)}...`);
  }

  // Actualizar el último ID visto
  saveStorage({ lastTweetId: tweets[0].id });
}

async function main() {
  console.log('Iniciando bot...');
  await start();
  
  // Primera ejecución inmediata
  await checkNewTweets();
  
  // Después cada X minutos
  setInterval(checkNewTweets, INTERVAL_MINUTES * 60 * 1000);
}

main().catch(console.error);