const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("coord_info")
        .setDescription("Automatically show coord info in a channel!")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .setNameLocalizations({
            hu: "koordináta_infó"
        })
        .setDescriptionLocalizations({
            hu: "Automata koordináta infó jelzés egy csatornán!"
        })
        .addSubcommand(command =>
            command.setName("set_channel")
                .setDescription("Set auto coord info to a channel")
                .setNameLocalizations({
                    hu: "csatorna_beállítás"
                })
                .setDescriptionLocalizations({
                    hu: "Automata koordináta infó beállítása egy csatornán"
                })
                .addStringOption(option =>
                    option.setName("server")
                        .setDescription("Server")
                        .setRequired(true)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szerver"
                        })
                        .setDescriptionLocalizations({
                            hu: "Szerver"
                        })
                )
                .addChannelOption(option =>
                    option.setName("channel")
                        .setDescription("Channel ")
                        .setNameLocalizations({
                            hu: "csatorna"
                        })
                        .setDescriptionLocalizations({
                            hu: "Csatorna"
                        })
                )
        )
        .addSubcommand(command =>
            command.setName("delete_channel")
                .setDescription("Delete auto coord info on a channel")
                .setNameLocalizations({
                    hu: "csatorna_törlés"
                })
                .setDescriptionLocalizations({
                    hu: "Automata koordináta infó törlése egy csatornán"
                })
                .addChannelOption(option =>
                    option.setName("channel")
                        .setDescription("Channel ")
                        .setNameLocalizations({
                            hu: "csatorna"
                        })
                        .setDescriptionLocalizations({
                            hu: "Csatorna"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("all")
                        .setDescription("All")
                        .setNameLocalizations({
                            hu: "mind"
                        })
                        .setDescriptionLocalizations({
                            hu: "Mind"
                        })
                )
        )
        .addSubcommand(command =>
            command.setName("activate")
                .setDescription("Coordinate info activation/deactivation on the server")
                .setNameLocalizations({
                    hu: "aktiválás"
                })
                .setDescriptionLocalizations({
                    hu: "Koordináta infó aktiválása/deaktiválása a szerveren"
                })
                .addBooleanOption(option =>
                    option.setName("active")
                        .setDescription("Activate?")
                        .setRequired(true)
                        .setNameLocalizations({
                            hu: "aktív"
                        })
                        .setDescriptionLocalizations({
                            hu: "Aktíválás?"
                        })
                )
        ),
    async execute(interaction, set_coord_info) {
        await interaction.deferReply({ ephemeral: true });
        set_coord_info(interaction);
    },
}