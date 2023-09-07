const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("bot_control")
        .setDescription("Control the bot!")
        .setNameLocalizations({
            hu: "bot_control",
        })
        .setDescriptionLocalizations({
            hu: "Bot irányítása!"
        })
        .setDefaultMemberPermissions(0)
        .addSubcommand(command =>
            command.setName("shutdown")
                .setDescription("Shutdown the bot!")
                .setNameLocalizations({
                    hu: "shutdown"
                })
                .setDescriptionLocalizations({
                    hu: "Bot leállítása!"
                })
                .addBooleanOption(option =>
                    option.setName("sure")
                        .setDescription("Are you sure you want to shutdown?")
                        .setRequired(true)
                        .setNameLocalizations({
                            hu: "biztos"
                        })
                        .setDescriptionLocalizations({
                            hu: "Biztos vagy benne, hogy leállítod?"
                        })
                )
        )
        .addSubcommand(command =>
            command.setName("restart")
                .setDescription("Restart the bot!")
                .setNameLocalizations({
                    hu: "restart"
                })
                .setDescriptionLocalizations({
                    hu: "Bot újraindítása!"
                })
                .addBooleanOption(option =>
                    option.setName("sure")
                        .setDescription("Are you sure you want to restart?")
                        .setRequired(true)
                        .setNameLocalizations({
                            hu: "biztos"
                        })
                        .setDescriptionLocalizations({
                            hu: "Biztos vagy benne, hogy újraindítod?"
                        })
                )
        )
        .addSubcommand(command =>
            command.setName("update")
                .setDescription("Update the bot with package!")
                .setNameLocalizations({
                    hu: "frissítés"
                })
                .setDescriptionLocalizations({
                    hu: "Bot frissítése frissítő csomaggal!"
                })
                .addAttachmentOption(option =>
                    option.setName("package")
                        .setDescription("Update package")
                        .setRequired(true)
                        .setNameLocalizations({
                            hu: "csomag"
                        })
                        .setDescriptionLocalizations({
                            hu: "Frissítő csomag"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("sure")
                        .setDescription("Are you sure you want to update?")
                        .setRequired(true)
                        .setNameLocalizations({
                            hu: "biztos"
                        })
                        .setDescriptionLocalizations({
                            hu: "Biztos vagy benne, hogy frissíted?"
                        })
                )
        )
        .addSubcommand(command =>
            command.setName("script")
                .setDescription("Execute a script that will run!")
                .setNameLocalizations({
                    hu: "script"
                })
                .setDescriptionLocalizations({
                    hu: "Script futtatása a boton!"
                })
                .addAttachmentOption(option =>
                    option.setName("code")
                        .setDescription("Script code")
                        .setRequired(true)
                        .setNameLocalizations({
                            hu: "kód"
                        })
                        .setDescriptionLocalizations({
                            hu: "Script kód"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("sure")
                        .setDescription("Are you sure you want to update?")
                        .setRequired(true)
                        .setNameLocalizations({
                            hu: "biztos"
                        })
                        .setDescriptionLocalizations({
                            hu: "Biztos vagy benne, hogy frissíted?"
                        })
                )
        ),
    async execute(interaction, bot_control) {
        await interaction.deferReply({ ephemeral: true });
        bot_control(interaction);
    },
}