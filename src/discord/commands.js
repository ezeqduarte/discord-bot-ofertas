const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { addUser, removeUser, getAllUsers } = require('../storage');
const { createBrowserContext, fetchTweetsWithRetry } = require('../scraper');
const { buildTweetEmbeds } = require('./embeds');
const { parseUsername } = require('../utils/username');
const status = require('../utils/status');

let checkSingleUser = null;

function setCheckSingleUser(fn) {
  checkSingleUser = fn;
}

const CHEQUEAR_COOLDOWN_MS = 30_000;
const chequearCooldowns = new Map();

function getRemainingCooldown(userId) {
  const last = chequearCooldowns.get(userId);
  if (!last) return 0;
  return Math.max(0, CHEQUEAR_COOLDOWN_MS - (Date.now() - last));
}

const commands = [
    new SlashCommandBuilder()
        .setName('agregar')
        .setDescription('Agregar un usuario de Twitter para monitorear')
        .addStringOption(option =>
            option.setName('usuario')
                .setDescription('Handle de Twitter (sin el @)')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('quitar')
        .setDescription('Dejar de monitorear un usuario')
        .addStringOption(option =>
            option.setName('usuario')
                .setDescription('Handle de Twitter (sin el @)')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('lista')
        .setDescription('Ver los usuarios monitoreados'),

    new SlashCommandBuilder()
        .setName('chequear')
        .setDescription('Ver el último tweet de un usuario ahora mismo')
        .addStringOption(option =>
            option.setName('usuario')
                .setDescription('Handle de Twitter (sin el @)')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('ayuda')
        .setDescription('Mostrar todos los comandos disponibles'),

    new SlashCommandBuilder()
        .setName('estado')
        .setDescription('Ver el estado actual del bot'),
];

function formatDuration(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${secs}s`;
}

function getCookieStatus() {
  try {
    const cookiesRaw = process.env.TWITTER_COOKIES;
    if (!cookiesRaw) throw new Error('TWITTER_COOKIES no definida');
    const cookies = JSON.parse(cookiesRaw);
    const now = Date.now() / 1000;
    const WARN_DAYS = 7;

    const expired = cookies.filter(c => c.expirationDate && c.expirationDate < now);
    const expiringSoon = cookies.filter(c =>
      c.expirationDate &&
      c.expirationDate >= now &&
      c.expirationDate < now + WARN_DAYS * 86400
    );

    if (expired.length > 0) return { icon: '🔴', text: `${expired.length} cookie(s) expiradas` };
    if (expiringSoon.length > 0) {
      const days = Math.floor((expiringSoon[0].expirationDate - now) / 86400);
      return { icon: '🟡', text: `Expiran en ~${days} días` };
    }
    return { icon: '🟢', text: 'Válidas' };
  } catch {
    return { icon: '⚪', text: 'No se pudo leer TWITTER_COOKIES' };
  }
}

async function handleCommand(interaction) {
    const { commandName } = interaction;

    if (commandName === 'agregar') {
        const usuario = parseUsername(interaction.options.getString('usuario'));
        if (!usuario) {
          await interaction.reply({ content: '⚠️ Nombre de usuario inválido. Solo letras, números y `_`, máximo 15 caracteres.', ephemeral: true });
          return;
        }
        const channelId = interaction.channelId;

        const { alreadyExisted } = addUser(usuario, channelId);

        if (alreadyExisted) {
          await interaction.reply(`⚠️ **@${usuario}** ya estaba siendo monitoreado. Actualicé el canal a este.`);
        } else {
          await interaction.reply(`✅ Empecé a monitorear a **@${usuario}** en este canal. Buscando última oferta...`);
          if (checkSingleUser) {
            checkSingleUser(usuario).catch(err => console.error('Error en check inmediato:', err));
          }
        }
    }

    else if (commandName === 'quitar') {
        const usuario = parseUsername(interaction.options.getString('usuario'));
        if (!usuario) {
          await interaction.reply({ content: '⚠️ Nombre de usuario inválido.', ephemeral: true });
          return;
        }
        const removed = removeUser(usuario);

        if (removed) {
            await interaction.reply(`🗑️ Dejé de monitorear a **@${usuario}**.`);
        } else {
            await interaction.reply(`⚠️ **@${usuario}** no estaba en la lista.`);
        }
    }

    else if (commandName === 'chequear') {
        const usuario = parseUsername(interaction.options.getString('usuario'));
        if (!usuario) {
          await interaction.reply({ content: '⚠️ Nombre de usuario inválido.', ephemeral: true });
          return;
        }

        const users = getAllUsers();
        const monitored = users.find(u => u.username === usuario);
        if (!monitored) {
            await interaction.reply({ content: `⚠️ **@${usuario}** no está en la lista de monitoreados. Usá \`/lista\` para ver los disponibles o \`/agregar\` para sumarlo.`, ephemeral: true });
            return;
        }

        const remaining = getRemainingCooldown(interaction.user.id);
        if (remaining > 0) {
            const segs = Math.ceil(remaining / 1000);
            await interaction.reply({ content: `⏳ Esperá ${segs}s antes de volver a usar /chequear.`, ephemeral: true });
            return;
        }
        chequearCooldowns.set(interaction.user.id, Date.now());

        await interaction.deferReply();

        let browser, context;
        try {
            ({ browser, context } = await createBrowserContext());
            const tweets = await fetchTweetsWithRetry(usuario, context);

            if (tweets.length === 0) {
                await interaction.editReply(`⚠️ No se encontraron tweets de **@${usuario}**. El perfil puede ser privado o no existe.`);
                return;
            }

            const tweet = tweets[0];
            await interaction.editReply({
                content: `🔍 Último tweet de **@${usuario}**`,
                embeds: buildTweetEmbeds(tweet)
            });
        } catch (err) {
            if (err.code === 'SESSION_EXPIRED') {
                await interaction.editReply('⚠️ **Las cookies de Twitter expiraron.** Actualizá la variable `TWITTER_COOKIES` y reiniciá el bot.');
            } else {
                console.error(`Error en /chequear @${usuario}:`, err.message);
                await interaction.editReply(`❌ Error al obtener el tweet de **@${usuario}**.`);
            }
        } finally {
            if (browser) await browser.close();
        }
    }

    else if (commandName === 'estado') {
        const uptime = formatDuration(Date.now() - status.getStartTime());

        const lastCycle = status.getLastCycleStart();
        const lastCycleText = lastCycle
            ? `Hace ${formatDuration(Date.now() - lastCycle)}`
            : 'Todavía no corrió';

        const nextCycle = status.getNextCycleAt();
        const nextCycleText = nextCycle
            ? `En ${formatDuration(Math.max(0, nextCycle - Date.now()))}`
            : 'Pendiente...';

        const users = getAllUsers();
        const cookieStatus = getCookieStatus();

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('📊 Estado del bot')
            .addFields(
                { name: '⏱️ Uptime', value: uptime, inline: true },
                { name: '👥 Usuarios monitoreados', value: `${users.length}`, inline: true },
                { name: `${cookieStatus.icon} Cookies de Twitter`, value: cookieStatus.text, inline: true },
                { name: '🕐 Último ciclo', value: lastCycleText, inline: true },
                { name: '⏭️ Próximo ciclo', value: nextCycleText, inline: true },
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    else if (commandName === 'ayuda') {
        const embed = new EmbedBuilder()
            .setColor(0x1DA1F2)
            .setTitle('🤖 Bot de Ofertas — Comandos')
            .setDescription(
                'Monitoreo automático de cuentas de Twitter/X. ' +
                'Cada vez que un usuario monitoreado postea un tweet, el bot lo manda al canal correspondiente.'
            )
            .addFields(
                {
                    name: '`/agregar <usuario>`',
                    value: 'Empieza a monitorear una cuenta. El bot va a avisar en el canal donde uses este comando cada vez que esa cuenta tuitee.',
                },
                {
                    name: '`/quitar <usuario>`',
                    value: 'Deja de monitorear una cuenta y la elimina de la lista.',
                },
                {
                    name: '`/lista`',
                    value: 'Muestra todas las cuentas que se están monitoreando actualmente.',
                },
                {
                    name: '`/chequear <usuario>`',
                    value: 'Busca y muestra el último tweet de una cuenta ahora mismo, sin esperar al ciclo automático. Tiene un cooldown de 30s.',
                },
                {
                    name: '`/ayuda`',
                    value: 'Muestra este mensaje.',
                },
                {
                    name: '⏱️ Frecuencia de chequeo',
                    value: 'El bot revisa las cuentas monitoreadas cada 5 minutos automáticamente.',
                }
            )
            .setFooter({ text: 'Los tweets se detectan comparando IDs — nunca se manda el mismo dos veces.' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    else if (commandName === 'lista') {
        const users = getAllUsers();

        if (users.length === 0) {
            await interaction.reply('📭 No hay usuarios monitoreados. Usá `/agregar` para empezar.');
            return;
        }

        const lista = users
            .map(u => `• **@${u.username}** → [Link al perfil](https://x.com/${u.username})`)
            .join('\n');

        await interaction.reply({
            content: `📋 **Usuarios monitoreados:**\n${lista}`,
            flags: 4
        });
    }
}

module.exports = { commands, handleCommand, setCheckSingleUser };
