const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("guild_settings")
        .setDescription("Global guild settings")
        .setNameLocalizations({
            hu: "szerver_beállítások"
        })
        .setDescriptionLocalizations({
            hu: "Globális klán beállítások!"
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(command =>
            command.setName("modify")
                .setDescription("Modify basic guild settings")
                .setNameLocalizations({
                    hu: "módosítás"
                })
                .setDescriptionLocalizations({
                    hu: "Szerver alap beállításainak módosítása"
                })
                .addBooleanOption(option =>
                    option.setName("active")
                        .setDescription("Bot activation/deactivation on the server")
                        .setNameLocalizations({
                            hu: "aktív"
                        })
                        .setDescriptionLocalizations({
                            hu: "Bot aktiválása/deaktiválása a szerveren"
                        })
                )
                .addStringOption(option =>
                    option.setName("password")
                        .setDescription("Bot admin password")
                        .setNameLocalizations({
                            hu: "jelszó"
                        })
                        .setDescriptionLocalizations({
                            hu: "Bot admin jelszó"
                        })
                        .setMinLength(4)
                        .setMaxLength(32)
                )
                .addStringOption(option =>
                    option.setName("market")
                        .setDescription("Guild market locale")
                        .setNameLocalizations({
                            hu: "piac"
                        })
                        .setDescriptionLocalizations({
                            hu: "Szerver piac lokalizáció"
                        })
                        .setAutocomplete(true)
                )
                .addStringOption(option =>
                    option.setName("language")
                        .setDescription("Preferred language")
                        .setNameLocalizations({
                            hu: "nyelv"
                        })
                        .setDescriptionLocalizations({
                            hu: "Preferált nyelv"
                        })
                        .setAutocomplete(true)
                )
                .addStringOption(option =>
                    option.setName("global_world")
                        .setDescription("Global world on server")
                        .setNameLocalizations({
                            hu: "globális_világ"
                        })
                        .setDescriptionLocalizations({
                            hu: "Globális világ a szerveren"
                        })
                        .setAutocomplete(true)
                )
                .addStringOption(option =>
                    option.setName("global_guild")
                        .setDescription("Global guild on server")
                        .setNameLocalizations({
                            hu: "globális_klán"
                        })
                        .setDescriptionLocalizations({
                            hu: "Globális klán a szerveren"
                        })
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(command =>
            command.setName("list")
                .setDescription("Shows current global guild settings")
                .setNameLocalizations({
                    hu: "lista"
                })
                .setDescriptionLocalizations({
                    hu: "Globális szerver beállítások megjelenítése"
                })
        ),
    async execute(interaction, set_guild_settings) {
        await interaction.deferReply({ ephemeral: true });
        set_guild_settings(interaction);
    },
}