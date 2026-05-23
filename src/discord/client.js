const { Client, GatewayIntentBits } = require('discord.js');
const { handleCommand } = require('./commands');
const { buildTweetEmbeds } = require('./embeds');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

let ready = false;

client.once('ready', () => {
  console.log(`Bot conectado como ${client.user.tag}`);
  ready = true;
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    await handleCommand(interaction);
  } catch (error) {
    console.error('Error en comando:', error);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ Error ejecutando el comando', ephemeral: true });
    }
  }
});

async function sendTweet(channelId, tweet) {
  if (!ready) {
    console.error('Bot no está listo');
    return false;
  }

  try {
    const channel = await client.channels.fetch(channelId);
    await channel.send({
      content: `🔥 **Nueva oferta de ${tweet.authorName}**`,
      embeds: buildTweetEmbeds(tweet)
    });
    return true;
  } catch (error) {
    console.error('Error enviando mensaje:', error.message);
    return false;
  }
}

async function sendAlert(channelId, message) {
  if (!ready) return;
  try {
    const channel = await client.channels.fetch(channelId);
    await channel.send(message);
  } catch (error) {
    console.error('Error enviando alerta:', error.message);
  }
}

async function start() {
  await client.login(process.env.DISCORD_TOKEN);
  await new Promise(resolve => {
    const check = setInterval(() => {
      if (ready) {
        clearInterval(check);
        resolve();
      }
    }, 100);
  });
}

module.exports = { start, sendTweet, sendAlert };
