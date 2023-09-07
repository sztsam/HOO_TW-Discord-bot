const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Help functions using the bot / report bug!")
        .setNameLocalizations({
            hu: "segítség"
        })
        .setDescriptionLocalizations({
            hu: "Segítséget ad a használathoz / hiba jelentése!"
        })
        .addSubcommand(command =>
            command.setName("bug")
                .setDescription("Report bugs")
                .setNameLocalizations({
                    hu: "hiba"
                })
                .setDescriptionLocalizations({
                    hu: "hiba jelentése"
                })
                .addStringOption(option =>
                    option.setName("text")
                        .setDescription("explain bug details")
                        .setRequired(true)
                        .setNameLocalizations({
                            hu: "hiba"
                        })
                        .setDescriptionLocalizations({
                            hu: "hiba leírása"
                        })
                )
        )
        .addSubcommand(command =>
            command.setName("idea")
                .setDescription("Request a feature / enchancement")
                .setNameLocalizations({
                    hu: "ötlet"
                })
                .setDescriptionLocalizations({
                    hu: "Írj ötletet / feljesztést"
                })
                .addStringOption(option =>
                    option.setName("text")
                        .setDescription("explain idea/feature details")
                        .setRequired(true)
                        .setNameLocalizations({
                            hu: "ötlet"
                        })
                        .setDescriptionLocalizations({
                            hu: "ötlet / fejlesztés leírása"
                        })
                )
        ),
    async execute(interaction, help_handler) {
        await interaction.deferReply({ ephemeral: true });
        help_handler(interaction);
    },
}