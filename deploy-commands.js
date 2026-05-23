require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { commands } = require('./src/discord/commands');

const GUILD_ID = process.env.GUILD_ID;

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registrando slash commands en el servidor...');
    
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, GUILD_ID),
      { body: commands.map(c => c.toJSON()) }
    );
    
    console.log('✅ Slash commands registrados!');
  } catch (error) {
    console.error('Error registrando comandos:', error);
  }
})();