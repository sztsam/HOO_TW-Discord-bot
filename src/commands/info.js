const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("info")
        .setDescription("Showing info!")
        .setNameLocalizations({
            hu: "infó"
        })
        .setDescriptionLocalizations({
            hu: "Információt mutat!"
        })
        .addSubcommand(command =>
            command.setName("player")
                .setDescription("Show information about the player")
                .setNameLocalizations({
                    hu: "játékos"
                })
                .setDescriptionLocalizations({
                    hu: "Infó mutatása játékosról"
                })
                .addStringOption(option =>
                    option.setName("player")
                        .setDescription("Player information")
                        .setRequired(true)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "játékos"
                        })
                        .setDescriptionLocalizations({
                            hu: "Játékos akiről infót ad"
                        })
                )
                .addStringOption(option =>
                    option.setName("server")
                        .setDescription("Server")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szerver"
                        })
                        .setDescriptionLocalizations({
                            hu: "Szerver"
                        })
                )
        )
        .addSubcommand(command =>
            command.setName("ally")
                .setDescription("Show information about the tribe")
                .setNameLocalizations({
                    hu: "klán"
                })
                .setDescriptionLocalizations({
                    hu: "Infó mutatása klánról"
                })
                .addStringOption(option =>
                    option.setName("ally")
                        .setDescription("Tribe information")
                        .setRequired(true)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "klán"
                        })
                        .setDescriptionLocalizations({
                            hu: "Klán akiről infót ad"
                        })
                )
                .addStringOption(option =>
                    option.setName("server")
                        .setDescription("Server")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szerver"
                        })
                        .setDescriptionLocalizations({
                            hu: "Szerver"
                        })
                )
        )
        .addSubcommand(command =>
            command.setName("village")
                .setDescription("Show information about the village")
                .setNameLocalizations({
                    hu: "falu"
                })
                .setDescriptionLocalizations({
                    hu: "Infó mutatása faluról"
                })
                .addStringOption(option =>
                    option.setName("coord")
                        .setDescription("Village coordinate")
                        .setMinLength(4)
                        .setRequired(true)
                        .setAutocomplete(false)
                        .setNameLocalizations({
                            hu: "koordi"
                        })
                        .setDescriptionLocalizations({
                            hu: "Falu koordináta amiről infót ad"
                        })
                )
                .addStringOption(option =>
                    option.setName("server")
                        .setDescription("Server")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szerver"
                        })
                        .setDescriptionLocalizations({
                            hu: "Szerver"
                        })
                )
        ),
    async execute(interaction, show_info_tribal_data) {
        await interaction.deferReply({ ephemeral: false });
        show_info_tribal_data(interaction);
    },
}