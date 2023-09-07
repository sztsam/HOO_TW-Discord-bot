const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stat")
        .setDescription("Creating stats!")
        .setNameLocalizations({
            hu: "stat"
        })
        .setDescriptionLocalizations({
            hu: "Statisztikát készít!"
        })
        .addSubcommand(command =>
            command.setName("daily")
                .setDescription("Creating daily stats!")
                .setNameLocalizations({
                    hu: "napi"
                })
                .setDescriptionLocalizations({
                    hu: "Napi statisztikákat készít!"
                })
                .addStringOption(option =>
                    option.setName("scope")
                        .setDescription("Scope of stat")
                        .setRequired(true)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "hatókör"
                        })
                        .setDescriptionLocalizations({
                            hu: "Stat hatóköre"
                        })
                )
                .addStringOption(option =>
                    option.setName("server")
                        .setDescription("Server where it creates stats")
                        .setMinLength(4)
                        .setMaxLength(5)
                        .setRequired(true)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szerver"
                        })
                        .setDescriptionLocalizations({
                            hu: "Szerver ahonnan statot készít"
                        })
                )
                .addNumberOption(option =>
                    option.setName("size")
                        .setDescription("Size of stat")
                        .setMinValue(1)
                        .setMaxValue(25)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "méret"
                        })
                        .setDescriptionLocalizations({
                            hu: "statisztika mérete"
                        })
                )
                .addStringOption(option =>
                    option.setName("ally")
                        .setDescription("tribe tag")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "klán"
                        })
                        .setDescriptionLocalizations({
                            hu: "klán név rövidítés"
                        })
                )
                .addStringOption(option =>
                    option.setName("type")
                        .setDescription("chart type")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "típus"
                        })
                        .setDescriptionLocalizations({
                            hu: "statisztika típusa"
                        })
                )
                .addStringOption(option =>
                    option.setName("style")
                        .setDescription("chart style")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "stílus"
                        })
                        .setDescriptionLocalizations({
                            hu: "statisztika stílusa"
                        })
                )
                .addStringOption(option =>
                    option.setName("color")
                        .setDescription("chart backgound color")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szín"
                        })
                        .setDescriptionLocalizations({
                            hu: "statisztika háttérszíne"
                        })
                )
        )
        .addSubcommand(command =>
            command.setName("od")
                .setDescription("Creating OD stats!")
                .setNameLocalizations({
                    hu: "le"
                })
                .setDescriptionLocalizations({
                    hu: "LE statisztikákat készít!"
                })
                .addStringOption(option =>
                    option.setName("scope")
                        .setDescription("Scope of stat")
                        .setRequired(true)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "hatókör"
                        })
                        .setDescriptionLocalizations({
                            hu: "Stat hatóköre"
                        })
                )
                .addStringOption(option =>
                    option.setName("server")
                        .setDescription("Server where it creates stats")
                        .setMinLength(4)
                        .setMaxLength(5)
                        .setRequired(true)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szerver"
                        })
                        .setDescriptionLocalizations({
                            hu: "Szerver ahonnan statot készít"
                        })
                )
                .addNumberOption(option =>
                    option.setName("size")
                        .setDescription("Size of stat")
                        .setMinValue(1)
                        .setMaxValue(25)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "méret"
                        })
                        .setDescriptionLocalizations({
                            hu: "statisztika mérete"
                        })
                )
                .addStringOption(option =>
                    option.setName("ally")
                        .setDescription("tribe tag")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "klán"
                        })
                        .setDescriptionLocalizations({
                            hu: "klán név rövidítés"
                        })
                )
                .addStringOption(option =>
                    option.setName("type")
                        .setDescription("chart type")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "típus"
                        })
                        .setDescriptionLocalizations({
                            hu: "statisztika típusa"
                        })
                )
                .addStringOption(option =>
                    option.setName("style")
                        .setDescription("chart style")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "stílus"
                        })
                        .setDescriptionLocalizations({
                            hu: "statisztika stílusa"
                        })
                )
                .addStringOption(option =>
                    option.setName("color")
                        .setDescription("chart backgound color")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szín"
                        })
                        .setDescriptionLocalizations({
                            hu: "statisztika háttérszíne"
                        })
                )
        )
        .addSubcommand(command =>
            command.setName("conquer")
                .setDescription("Creating conquer / war stats!")
                .setNameLocalizations({
                    hu: "háborús"
                })
                .setDescriptionLocalizations({
                    hu: "Foglalás / háborús statisztikákat készít!"
                })
                .addStringOption(option =>
                    option.setName("server")
                        .setDescription("Server where it creates stats")
                        .setMinLength(4)
                        .setMaxLength(5)
                        .setRequired(true)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szerver"
                        })
                        .setDescriptionLocalizations({
                            hu: "Szerver ahonnan statot készít"
                        })
                )
                .addNumberOption(option =>
                    option.setName("size")
                        .setDescription("Size of stat")
                        .setMinValue(1)
                        .setMaxValue(25)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "méret"
                        })
                        .setDescriptionLocalizations({
                            hu: "statisztika mérete"
                        })
                )
                .addStringOption(option =>
                    option.setName("ally")
                        .setDescription("ally tribe tag. Ally separator with &")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szövetséges"
                        })
                        .setDescriptionLocalizations({
                            hu: "szövetséges klán név rövidítés. Klán elválasztó & jellel"
                        })
                )
                .addStringOption(option =>
                    option.setName("enemy")
                        .setDescription("enemy tribe tag. Ally separator with &")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "ellenfél"
                        })
                        .setDescriptionLocalizations({
                            hu: "ellenfél klán név rövidítés. Klán elválasztó & jellel"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("barbarian")
                        .setDescription("show barbarian conquers")
                        .setRequired(false)
                        .setNameLocalizations({
                            hu: "barbár"
                        })
                        .setDescriptionLocalizations({
                            hu: "barbár foglalások megjelenítése"
                        })
                )
                .addIntegerOption(option =>
                    option.setName("continent")
                        .setDescription("show conquers only on this continent")
                        .setRequired(false)
                        .setAutocomplete(false)
                        .setMinValue(0)
                        .setMaxValue(100)
                        .setNameLocalizations({
                            hu: "kontinens"
                        })
                        .setDescriptionLocalizations({
                            hu: "foglalások mutatása csak ezen a kontinensen"
                        })
                )
                .addStringOption(option =>
                    option.setName("from")
                        .setDescription("show conquers from date. example: 2000.01.01 or 01.01.2000, separators supported:  _,./:;-")
                        .setRequired(false)
                        .setAutocomplete(false)
                        .setNameLocalizations({
                            hu: "ettől"
                        })
                        .setDescriptionLocalizations({
                            hu: "foglalások mutatása dátumtól. példa: 2000.01.01 vagy 01.01.2000, támogatott elválasztók:  _,./:;-"
                        })
                )
                .addStringOption(option =>
                    option.setName("to")
                        .setDescription("show conquers till date. example: 2000.01.01 or 01.01.2000, separators supported:  _,./:;-")
                        .setRequired(false)
                        .setAutocomplete(false)
                        .setNameLocalizations({
                            hu: "eddíg"
                        })
                        .setDescriptionLocalizations({
                            hu: "foglalások mutatása dátumig. példa: 2000.01.01 vagy 01.01.2000, támogatott elválasztók:  _,./:;-"
                        })
                )
                .addStringOption(option =>
                    option.setName("type")
                        .setDescription("chart type")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "típus"
                        })
                        .setDescriptionLocalizations({
                            hu: "statisztika típusa"
                        })
                )
                .addStringOption(option =>
                    option.setName("style")
                        .setDescription("chart style")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "stílus"
                        })
                        .setDescriptionLocalizations({
                            hu: "statisztika stílusa"
                        })
                )
                .addStringOption(option =>
                    option.setName("color")
                        .setDescription("chart backgound color")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szín"
                        })
                        .setDescriptionLocalizations({
                            hu: "statisztika háttérszíne"
                        })
                )
        ),
    async execute(interaction, generate_chart) {
        await interaction.deferReply();
        generate_chart(interaction);
    },
}