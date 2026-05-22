require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

let ready = false;

client.once('ready', () => {
  console.log(`Bot conectado como ${client.user.tag}`);
  ready = true;
});

async function sendTweet(channelId, tweet) {
  if (!ready) return;
  
  try {
    const channel = await client.channels.fetch(channelId);
    await channel.send(`🔥 **Nueva oferta de Miss Ofertas by Vero**\n\n${tweet.text}\n\n${tweet.url}`);
  } catch (error) {
    console.error('Error enviando mensaje:', error.message);
  }
}

async function start() {
  await client.login(process.env.DISCORD_TOKEN);
  // Esperar a que esté ready
  await new Promise(resolve => {
    const check = setInterval(() => {
      if (ready) {
        clearInterval(check);
        resolve();
      }
    }, 100);
  });
}

module.exports = { start, sendTweet };