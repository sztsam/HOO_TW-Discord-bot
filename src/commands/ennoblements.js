const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ennoblements")
        .setDescription("Creates ennoblements notifications!")
        .setNameLocalizations({
            hu: "foglalás"
        })
        .setDescriptionLocalizations({
            hu: "Foglalás jelzéseket hoz létre!"
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(command =>
            command.setName("add")
                .setDescription("Add ennoblements notifications")
                .setNameLocalizations({
                    hu: "hozzáad"
                })
                .setDescriptionLocalizations({
                    hu: "Foglalás jelzáseket hoz létre"
                })
                .addStringOption(option =>
                    option.setName("server")
                        .setDescription("Server where it creates ennoblements")
                        .setMinLength(4)
                        .setMaxLength(5)
                        .setRequired(true)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szerver"
                        })
                        .setDescriptionLocalizations({
                            hu: "Szerver ahonnan foglalásjelzőt készít"
                        })
                )
                .addStringOption(option =>
                    option.setName("tribe")
                        .setDescription("tribe tag. with & you can select more than one")
                        .setRequired(true)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "klán"
                        })
                        .setDescriptionLocalizations({
                            hu: "klán név rövidítés. & jellel elválasztva több beírható"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("gain")
                        .setDescription("Conquered villages from players")
                        .setNameLocalizations({
                            hu: "nyereség"
                        })
                        .setDescriptionLocalizations({
                            hu: "Foglalás játékos ellen"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("loss")
                        .setDescription("Lost villages")
                        .setNameLocalizations({
                            hu: "veszteség"
                        })
                        .setDescriptionLocalizations({
                            hu: "Faluvesztés"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("self")
                        .setDescription("Self conquered villages")
                        .setNameLocalizations({
                            hu: "önhódítás"
                        })
                        .setDescriptionLocalizations({
                            hu: "Önhódítás foglalások"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("internal")
                        .setDescription("Conquered villages from ally")
                        .setNameLocalizations({
                            hu: "belső"
                        })
                        .setDescriptionLocalizations({
                            hu: "Foglalás klántag ellen"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("barbarian")
                        .setDescription("Conquered villages from barbarian")
                        .setNameLocalizations({
                            hu: "barbár"
                        })
                        .setDescriptionLocalizations({
                            hu: "Foglalás barbár ellen"
                        })
                )
                .addStringOption(option =>
                    option.setName("continent")
                        .setDescription("Continent where the ennoblements are shown. with & you can select more than one")
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "kontinens"
                        })
                        .setDescriptionLocalizations({
                            hu: "Kontinensek ahol a foglalást jelzi. & jellel elválasztva több beírható"
                        })
                )
                .addChannelOption(option =>
                    option.setName("channel")
                        .setDescription("Channel ID where it puts ennoblements")
                        .setNameLocalizations({
                            hu: "csatorna"
                        })
                        .setDescriptionLocalizations({
                            hu: "Csatorna ID ahova a foglalásjelzéseket teszi"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("play")
                        .setDescription("Flag the ennoblement as active or not active")
                        .setNameLocalizations({
                            hu: "aktív"
                        })
                        .setDescriptionLocalizations({
                            hu: "Foglalásjelző megjelölése aktívként vagy inaktívként"
                        })
                )
        )
        .addSubcommand(command =>
            command.setName("delete")
                .setDescription("Delete ennoblements notifications")
                .setNameLocalizations({
                    hu: "törlés"
                })
                .setDescriptionLocalizations({
                    hu: "Foglalás jelzést töröl"
                })
                .addStringOption(option =>
                    option.setName("id")
                        .setDescription("Delete ennoblement by ID")
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "id"
                        })
                        .setDescriptionLocalizations({
                            hu: "Foglalásjelző törlése ID alapján"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("all")
                        .setDescription("Delete all ennoblements notifications")
                        .setNameLocalizations({
                            hu: "mind"
                        })
                        .setDescriptionLocalizations({
                            hu: "Összes foglalásjelző törlése"
                        })
                )
        )
        .addSubcommand(command =>
            command.setName("modify")
                .setDescription("Modify ennoblement notification")
                .setNameLocalizations({
                    hu: "módosítás"
                })
                .setDescriptionLocalizations({
                    hu: "Foglalás jelzést módosít"
                })
                .addStringOption(option =>
                    option.setName("id")
                        .setDescription("Delete ennoblement by ID")
                        .setAutocomplete(true)
                        .setRequired(true)
                        .setNameLocalizations({
                            hu: "id"
                        })
                        .setDescriptionLocalizations({
                            hu: "Foglalásjelző törlése ID alapján"
                        })
                )
                .addStringOption(option =>
                    option.setName("server")
                        .setDescription("Server where it creates ennoblements")
                        .setMinLength(4)
                        .setMaxLength(5)
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szerver"
                        })
                        .setDescriptionLocalizations({
                            hu: "Szerver ahonnan foglalásjelzőt készít"
                        })
                )
                .addStringOption(option =>
                    option.setName("tribe")
                        .setDescription("tribe tag. with & you can select more than one")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "klán"
                        })
                        .setDescriptionLocalizations({
                            hu: "klán név rövidítés. & jellel elválasztva több beírható"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("gain")
                        .setDescription("Conquered villages from players")
                        .setNameLocalizations({
                            hu: "nyereség"
                        })
                        .setDescriptionLocalizations({
                            hu: "Foglalás játékos ellen"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("loss")
                        .setDescription("Lost villages")
                        .setNameLocalizations({
                            hu: "veszteség"
                        })
                        .setDescriptionLocalizations({
                            hu: "Faluvesztés"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("self")
                        .setDescription("Self conquered villages")
                        .setNameLocalizations({
                            hu: "önhódítás"
                        })
                        .setDescriptionLocalizations({
                            hu: "Önhódítás foglalások"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("internal")
                        .setDescription("Conquered villages from ally")
                        .setNameLocalizations({
                            hu: "belső"
                        })
                        .setDescriptionLocalizations({
                            hu: "Foglalás klántag ellen"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("barbarian")
                        .setDescription("Conquered villages from barbarian")
                        .setNameLocalizations({
                            hu: "barbár"
                        })
                        .setDescriptionLocalizations({
                            hu: "Foglalás barbár ellen"
                        })
                )
                .addStringOption(option =>
                    option.setName("continent")
                        .setDescription("Continent where the ennoblements are shown. with & you can select more than one")
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "kontinens"
                        })
                        .setDescriptionLocalizations({
                            hu: "Kontinensek ahol a foglalást jelzi. & jellel elválasztva több beírható"
                        })
                )
                .addChannelOption(option =>
                    option.setName("channel")
                        .setDescription("Channel ID where it puts ennoblements")
                        .setNameLocalizations({
                            hu: "csatorna"
                        })
                        .setDescriptionLocalizations({
                            hu: "Csatorna ID ahova a foglalásjelzéseket teszi"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("play")
                        .setDescription("Flag the ennoblement as active or not active")
                        .setNameLocalizations({
                            hu: "aktív"
                        })
                        .setDescriptionLocalizations({
                            hu: "Foglalásjelző megjelölése aktívként vagy inaktívként"
                        })
                )
        )
        .addSubcommand(command =>
            command.setName("list")
                .setDescription("Shows current list of ennoblements notification")
                .setNameLocalizations({
                    hu: "lista"
                })
                .setDescriptionLocalizations({
                    hu: "Jelenleg beállított foglalásjelző lista"
                })
                .addChannelOption(option =>
                    option.setName("channel")
                        .setDescription("List ennoblements on channel")
                        .setNameLocalizations({
                            hu: "csatorna"
                        })
                        .setDescriptionLocalizations({
                            hu: "Csatornán beállított foglalásjelző lista"
                        })
                )
        )
        .addSubcommand(command =>
            command.setName("settings")
                .setDescription("Settings of ennoblements notifications")
                .setNameLocalizations({
                    hu: "beállítások"
                })
                .setDescriptionLocalizations({
                    hu: "Foglalásjelző beállítások"
                })
                .addBooleanOption(option =>
                    option.setName("use_default")
                        .setDescription("Use the default preset")
                        .setNameLocalizations({
                            hu: "alap_beallitás"
                        })
                        .setDescriptionLocalizations({
                            hu: "Alap beállítás használata"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("guest_mode")
                        .setDescription("Use of guest mode links")
                        .setNameLocalizations({
                            hu: "vendég_mód"
                        })
                        .setDescriptionLocalizations({
                            hu: "Vendég mód linkek használata"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("village_points")
                        .setDescription("Show conquered village points")
                        .setNameLocalizations({
                            hu: "falu_pont"
                        })
                        .setDescriptionLocalizations({
                            hu: "Foglalt falu pont mutatása"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("player_points")
                        .setDescription("Show players points")
                        .setNameLocalizations({
                            hu: "játékos_pontok"
                        })
                        .setDescriptionLocalizations({
                            hu: "Játékos pont mutatása"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("tribe_points")
                        .setDescription("Show tribe points")
                        .setNameLocalizations({
                            hu: "klán_pontok"
                        })
                        .setDescriptionLocalizations({
                            hu: "Klán pont mutatása"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("old_owner")
                        .setDescription("Show old village owner")
                        .setNameLocalizations({
                            hu: "régi_tulaj"
                        })
                        .setDescriptionLocalizations({
                            hu: "Régi falu tulajdonos mutatása"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("date_time")
                        .setDescription("Show date and time")
                        .setNameLocalizations({
                            hu: "dátum_idő"
                        })
                        .setDescriptionLocalizations({
                            hu: "Foglalási dátum és időpont mutatása"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("relative_time")
                        .setDescription("Show relative time for current time")
                        .setNameLocalizations({
                            hu: "eltelt_idő"
                        })
                        .setDescriptionLocalizations({
                            hu: "Foglalás időpontjától eltelt idő mutatása"
                        })
                )
        ),
    async execute(interaction, set_ennoblements) {
        await interaction.deferReply({ ephemeral: true });
        set_ennoblements(interaction);
    },
}