const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("map")
        .setDescription("Creating a world map!")
        .setNameLocalizations({
            hu: "térkép"
        })
        .setDescriptionLocalizations({
            hu: "Világ térképet készít!"
        })
        .addStringOption(option =>
            option.setName("server")
                .setDescription("Server where it creates map")
                .setMinLength(4)
                .setMaxLength(5)
                .setRequired(true)
                .setAutocomplete(true)
                .setNameLocalizations({
                    hu: "szerver"
                })
                .setDescriptionLocalizations({
                    hu: "Szerver ahonnan térképet készít"
                })
        )
        .addStringOption(option =>
            option.setName("type")
                .setDescription("map type")
                .setRequired(true)
                .setAutocomplete(true)
                .setNameLocalizations({
                    hu: "típus"
                })
                .setDescriptionLocalizations({
                    hu: "térkép típusa"
                })
        ),
    async execute(interaction, get_generated_map) {
        await interaction.deferReply();
        get_generated_map(interaction);
    },
}