const { SlashCommandBuilder } = require('discord.js');
const { addUser, removeUser, getAllUsers } = require('./storage');

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
];

async function handleCommand(interaction) {
    const { commandName } = interaction;

    if (commandName === 'agregar') {
        const usuario = interaction.options.getString('usuario').replace('@', '').toLowerCase();
        const channelId = interaction.channelId;

        addUser(usuario, channelId);
        await interaction.reply(`✅ Empecé a monitorear a **@${usuario}** en este canal. Buscando última oferta...`);

        const { checkSingleUser } = require('./index');
        checkSingleUser(usuario).catch(err => console.error('Error en check inmediato:', err));
    }

    else if (commandName === 'quitar') {
        const usuario = interaction.options.getString('usuario').replace('@', '').toLowerCase();
        const removed = removeUser(usuario);

        if (removed) {
            await interaction.reply(`🗑️ Dejé de monitorear a **@${usuario}**.`);
        } else {
            await interaction.reply(`⚠️ **@${usuario}** no estaba en la lista.`);
        }
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

module.exports = { commands, handleCommand };