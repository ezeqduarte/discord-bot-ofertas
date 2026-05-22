require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { handleCommand } = require('./commands');

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

function buildTweetEmbeds(tweet) {
  const mainEmbed = new EmbedBuilder()
    .setColor(0x1DA1F2)
    .setTitle(`🔥 Nueva oferta de ${tweet.authorName}`)
    .setURL(tweet.url)
    .setAuthor({
      name: `${tweet.authorName} ${tweet.authorHandle}`,
      iconURL: 'https://abs.twimg.com/favicons/twitter.3.ico',
      url: `https://x.com/${tweet.authorHandle.replace('@', '')}`
    })
    .setDescription(tweet.text)
    .setTimestamp(new Date(tweet.datetime))
    .setFooter({ text: 'Twitter / X' });

  if (tweet.imageUrls && tweet.imageUrls.length > 0) {
    mainEmbed.setImage(tweet.imageUrls[0]);
  }

  const embeds = [mainEmbed];

  if (tweet.imageUrls && tweet.imageUrls.length > 1) {
    for (let i = 1; i < tweet.imageUrls.length && i < 4; i++) {
      embeds.push(new EmbedBuilder().setURL(tweet.url).setImage(tweet.imageUrls[i]));
    }
  }

  return embeds;
}

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

module.exports = { start, sendTweet, sendAlert, buildTweetEmbeds };