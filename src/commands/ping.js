const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Discord bot ping!')
        .setNameLocalizations({
            hu: "ping"
        })
        .setDescriptionLocalizations({
            hu: "Discord bot késleltetése!"
        }),
    async execute(discordClient, interaction) {
        await interaction.deferReply({ ephemeral: true });
        const translations = {
            en: `Latency is ${Date.now() - interaction.createdTimestamp}ms. API Latency is ${Math.round(discordClient.ws.ping)}ms`,
            hu: `Késleltetés ${Date.now() - interaction.createdTimestamp}ms. API késleltetés ${Math.round(discordClient.ws.ping)}ms`
        };
        await interaction.editReply(translations[interaction.locale] ?? translations["en"]);
    },
}