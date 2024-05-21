const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("bot_presence")
        .setDescription("Set presence of the bot!")
        .setNameLocalizations({
            hu: "bot_jelenlét",
        })
        .setDescriptionLocalizations({
            hu: "Bot jelenlét beállítása!"
        })
        .setDefaultMemberPermissions(0)
        .addStringOption(option =>
            option.setName("name")
                .setDescription("Bot presence name")
                .setRequired(true)
                .setNameLocalizations({
                    hu: "név"
                })
                .setDescriptionLocalizations({
                    hu: "Bot aktivitás neve"
                })
        )
        .addStringOption(option =>
            option.setName("type")
                .setDescription("Bot presence type")
                .setChoices(
                    { name: "Playing", value: "Playing" },
                    { name: "Streaming", value: "Streaming" },
                    { name: "Listening", value: "Listening" },
                    { name: "Watching", value: "Watching" },
                    { name: "Competing", value: "Competing" }
                )
                .setRequired(false)
                .setNameLocalizations({
                    hu: "típus"
                })
                .setDescriptionLocalizations({
                    hu: "Bot aktivitás típusa"
                })
        )
        .addStringOption(option =>
            option.setName("status")
                .setDescription("Bot presence status")
                .setChoices(
                    { name: "online", value: "online" },
                    { name: "idle", value: "idle" },
                    { name: "dnd", value: "dnd" },
                    { name: "invisible", value: "invisible" }
                )
                .setRequired(false)
                .setNameLocalizations({
                    hu: "státusz"
                })
                .setDescriptionLocalizations({
                    hu: "Bot aktivitás státusza"
                })
        )
    ,
    async execute(interaction, bot_activity_change) {
        await interaction.deferReply({ ephemeral: true });
        const options = {
            name: interaction.options.getString("name") ?? false,
            type: interaction.options.getString("type") ?? false,
            status: interaction.options.getString("status") ?? false
        };
        bot_activity_change(options.name, options.type, options.status);
        interaction.editReply({ content: "Presence changed", ephemeral: true });
    },
}