const { EmbedBuilder } = require('discord.js');

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

module.exports = { buildTweetEmbeds };
