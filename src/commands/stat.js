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
                            hu: "Statisztika mérete"
                        })
                )
                .addStringOption(option =>
                    option.setName("ally")
                        .setDescription("Tribe tag")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "klán"
                        })
                        .setDescriptionLocalizations({
                            hu: "Klán név rövidítés"
                        })
                )
                .addStringOption(option =>
                    option.setName("type")
                        .setDescription("Chart type")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "típus"
                        })
                        .setDescriptionLocalizations({
                            hu: "Statisztika típusa"
                        })
                )
                .addStringOption(option =>
                    option.setName("style")
                        .setDescription("Chart style")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "stílus"
                        })
                        .setDescriptionLocalizations({
                            hu: "Statisztika stílusa"
                        })
                )
                .addStringOption(option =>
                    option.setName("color")
                        .setDescription("Chart backgound color")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szín"
                        })
                        .setDescriptionLocalizations({
                            hu: "Statisztika háttérszíne"
                        })
                )
        )
        .addSubcommand(command =>
            command.setName("monthly")
                .setDescription("Creating monthly stats!")
                .setNameLocalizations({
                    hu: "havi"
                })
                .setDescriptionLocalizations({
                    hu: "Havi statisztikákat készít!"
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
                            hu: "Stat hatókör"
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
                .addStringOption(option =>
                    option.setName("player")
                        .setDescription("Player name")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "játékos"
                        })
                        .setDescriptionLocalizations({
                            hu: "Játékos neve"
                        })
                )
                .addStringOption(option =>
                    option.setName("ally")
                        .setDescription("Tribe tag. Ally separator with &")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "klán"
                        })
                        .setDescriptionLocalizations({
                            hu: "Klán név rövidítés. Klán elválasztó & jellel"
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
                            hu: "Statisztika mérete"
                        })
                )
                .addNumberOption(option =>
                    option.setName("month")
                        .setDescription("How many months")
                        .setMinValue(1)
                        .setMaxValue(12)
                        .setChoices(
                            { name: "1", value: 1 },
                            { name: "2", value: 2 },
                            { name: "3", value: 3 },
                            { name: "6", value: 6 },
                            { name: "12", value: 12 }
                        )
                        .setNameLocalizations({
                            hu: "hónap"
                        })
                        .setDescriptionLocalizations({
                            hu: "Hónapok száma"
                        })
                )
                .addStringOption(option =>
                    option.setName("type")
                        .setDescription("Chart type")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "típus"
                        })
                        .setDescriptionLocalizations({
                            hu: "Statisztika típusa"
                        })
                )
                .addStringOption(option =>
                    option.setName("style")
                        .setDescription("Chart style")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "stílus"
                        })
                        .setDescriptionLocalizations({
                            hu: "Statisztika stílusa"
                        })
                )
                .addStringOption(option =>
                    option.setName("color")
                        .setDescription("Chart backgound color")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szín"
                        })
                        .setDescriptionLocalizations({
                            hu: "Statisztika háttérszíne"
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
                            hu: "Statisztika mérete"
                        })
                )
                .addStringOption(option =>
                    option.setName("ally")
                        .setDescription("Tribe tag")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "klán"
                        })
                        .setDescriptionLocalizations({
                            hu: "Klán név rövidítés"
                        })
                )
                .addStringOption(option =>
                    option.setName("type")
                        .setDescription("Chart type")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "típus"
                        })
                        .setDescriptionLocalizations({
                            hu: "Statisztika típusa"
                        })
                )
                .addStringOption(option =>
                    option.setName("style")
                        .setDescription("Chart style")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "stílus"
                        })
                        .setDescriptionLocalizations({
                            hu: "Statisztika stílusa"
                        })
                )
                .addStringOption(option =>
                    option.setName("color")
                        .setDescription("Chart backgound color")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szín"
                        })
                        .setDescriptionLocalizations({
                            hu: "Statisztika háttérszíne"
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
                            hu: "Statisztika mérete"
                        })
                )
                .addStringOption(option =>
                    option.setName("ally")
                        .setDescription("Ally tribe tag. Ally separator with &")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szövetséges"
                        })
                        .setDescriptionLocalizations({
                            hu: "Szövetséges klán név rövidítés. Klán elválasztó & jellel"
                        })
                )
                .addStringOption(option =>
                    option.setName("enemy")
                        .setDescription("Enemy tribe tag. Ally separator with &")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "ellenfél"
                        })
                        .setDescriptionLocalizations({
                            hu: "Ellenfél klán név rövidítés. Klán elválasztó & jellel"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("barbarian")
                        .setDescription("Show barbarian conquers")
                        .setRequired(false)
                        .setNameLocalizations({
                            hu: "barbár"
                        })
                        .setDescriptionLocalizations({
                            hu: "Barbár foglalások megjelenítése"
                        })
                )
                .addIntegerOption(option =>
                    option.setName("continent")
                        .setDescription("Show conquers only on this continent")
                        .setRequired(false)
                        .setAutocomplete(false)
                        .setMinValue(0)
                        .setMaxValue(100)
                        .setNameLocalizations({
                            hu: "kontinens"
                        })
                        .setDescriptionLocalizations({
                            hu: "Foglalások mutatása csak ezen a kontinensen"
                        })
                )
                .addStringOption(option =>
                    option.setName("from")
                        .setDescription("Show conquers from date. example: 2000.01.01 or 01.01.2000, separators supported:  _,./:;-")
                        .setRequired(false)
                        .setAutocomplete(false)
                        .setNameLocalizations({
                            hu: "ettől"
                        })
                        .setDescriptionLocalizations({
                            hu: "Foglalások mutatása dátumtól. példa: 2000.01.01 vagy 01.01.2000, támogatott elválasztók:  _,./:;-"
                        })
                )
                .addStringOption(option =>
                    option.setName("to")
                        .setDescription("Show conquers till date. example: 2000.01.01 or 01.01.2000, separators supported:  _,./:;-")
                        .setRequired(false)
                        .setAutocomplete(false)
                        .setNameLocalizations({
                            hu: "eddíg"
                        })
                        .setDescriptionLocalizations({
                            hu: "Foglalások mutatása dátumig. példa: 2000.01.01 vagy 01.01.2000, támogatott elválasztók:  _,./:;-"
                        })
                )
                .addStringOption(option =>
                    option.setName("type")
                        .setDescription("Chart type")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "típus"
                        })
                        .setDescriptionLocalizations({
                            hu: "Statisztika típusa"
                        })
                )
                .addStringOption(option =>
                    option.setName("style")
                        .setDescription("Chart style")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "stílus"
                        })
                        .setDescriptionLocalizations({
                            hu: "Statisztika stílusa"
                        })
                )
                .addStringOption(option =>
                    option.setName("color")
                        .setDescription("Chart backgound color")
                        .setRequired(false)
                        .setAutocomplete(true)
                        .setNameLocalizations({
                            hu: "szín"
                        })
                        .setDescriptionLocalizations({
                            hu: "Statisztika háttérszíne"
                        })
                )
        ),
    async execute(interaction, generate_chart) {
        await interaction.deferReply();
        generate_chart(interaction);
    },
}