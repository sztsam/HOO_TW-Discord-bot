const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("swear_words")
        .setDescription("Punish swear words!")
        .setNameLocalizations({
            hu: "káromkodás"
        })
        .setDescriptionLocalizations({
            hu: "Káromkodások büntetése!"
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(command =>
            command.setName("modify")
                .setDescription("Modify basic swear words punishment settings")
                .setNameLocalizations({
                    hu: "módosítás"
                })
                .setDescriptionLocalizations({
                    hu: "Káromkodások büntetésének alap beállításainak módosítása"
                })
                .addBooleanOption(option =>
                    option.setName("enable")
                        .setDescription("Enable swear words punishment")
                        .setNameLocalizations({
                            hu: "engedélyezés"
                        })
                        .setDescriptionLocalizations({
                            hu: "Káromkodások büntetésének engedélyezése"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("use_default")
                        .setDescription("Use the default settings")
                        .setNameLocalizations({
                            hu: "alap_beállítások"
                        })
                        .setDescriptionLocalizations({
                            hu: "Alapértelmezett beállítások használata"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("use_ai_chat")
                        .setDescription("Enable AI chat")
                        .setNameLocalizations({
                            hu: "ai_chat_használat"
                        })
                        .setDescriptionLocalizations({
                            hu: "AI chat használata"
                        })
                )
                .addBooleanOption(option =>
                    option.setName("use_react_emoji")
                        .setDescription("Enable react emoji")
                        .setNameLocalizations({
                            hu: "emoji_használat"
                        })
                        .setDescriptionLocalizations({
                            hu: "Emoji használata"
                        })
                )
                .addStringOption(option =>
                    option.setName("add_words")
                        .setDescription("Add swear words to punish. use , separator")
                        .setNameLocalizations({
                            hu: "szavak_hozzáadása"
                        })
                        .setDescriptionLocalizations({
                            hu: "Káromkodások hozzáadása. Válaszd el , jellel"
                        })
                )
                .addStringOption(option =>
                    option.setName("delete_words")
                        .setDescription("Delete swear words to punish. use , separator")
                        .setNameLocalizations({
                            hu: "szavak_törlése"
                        })
                        .setDescriptionLocalizations({
                            hu: "Káromkodások törlése. Válaszd el , jellel"
                        })
                )
                .addStringOption(option =>
                    option.setName("add_emoji")
                        .setDescription("Add emojis to react. use , separator")
                        .setNameLocalizations({
                            hu: "emoji_hozzáadása"
                        })
                        .setDescriptionLocalizations({
                            hu: "Emojik hozzáadása. Válaszd el , jellel"
                        })
                )
                .addStringOption(option =>
                    option.setName("delete_emoji")
                        .setDescription("Delete emojis to react. use , separator")
                        .setNameLocalizations({
                            hu: "emoji_törlése"
                        })
                        .setDescriptionLocalizations({
                            hu: "Emojik törlése. Válaszd el , jellel"
                        })
                )
                .addNumberOption(option =>
                    option.setName("ai_chat_ratio")
                        .setDescription("Set ai chat occurrence ratio")
                        .setNameLocalizations({
                            hu: "ai_chat_arány"
                        })
                        .setDescriptionLocalizations({
                            hu: "Ai chat használat arány beállítása"
                        })
                        .setMinValue(0)
                        .setMaxValue(100)
                )
                .addNumberOption(option =>
                    option.setName("react_emoji_ratio")
                        .setDescription("Set react emoji occurrence ratio")
                        .setNameLocalizations({
                            hu: "emoji_reakció_arány"
                        })
                        .setDescriptionLocalizations({
                            hu: "Emoji reakció használat arány beállítása"
                        })
                        .setMinValue(0)
                        .setMaxValue(100)
                )
        )
        .addSubcommand(command =>
            command.setName("list")
                .setDescription("Shows current setting of swear words punishment / add to list")
                .setNameLocalizations({
                    hu: "lista"
                })
                .setDescriptionLocalizations({
                    hu: "Káromkodás büntetés beállításainak kiíratása / listákhoz adás"
                })
                .addStringOption(option =>
                    option.setName("action")
                        .setDescription("Action to perform with lists")
                        .setNameLocalizations({
                            hu: "művelet"
                        })
                        .setDescriptionLocalizations({
                            hu: "Listákkal való művelet"
                        })
                        .setChoices(
                            { name: "add", value: "add" },
                            { name: "delete", value: "delete" },
                            { name: "reset", value: "reset" }
                        )
                )
                .addStringOption(option =>
                    option.setName("type")
                        .setDescription("type of the list")
                        .setNameLocalizations({
                            hu: "típus"
                        })
                        .setDescriptionLocalizations({
                            hu: "Lista típusa"
                        })
                        .setChoices(
                            { name: "global black list", value: `["black_list"]` },
                            { name: "global white list", value: `["white_list"]` },
                            { name: "ai chat black list", value: `["ai_bot_chat"]["black_list"]` },
                            { name: "ai chat white list", value: `["ai_bot_chat"]["white_list"]` },
                            { name: "ai chat force list", value: `["ai_bot_chat"]["force_list"]` },
                            { name: "react emojis black list", value: `["react_emojis"]["black_list"]` },
                            { name: "react emojis white list", value: `["react_emojis"]["white_list"]` },
                            { name: "react emojis force list", value: `["react_emojis"]["force_list"]` }
                        )
                )
                .addUserOption(option =>
                    option.setName("user")
                        .setDescription("User to add/delete to list")
                        .setNameLocalizations({
                            hu: "személy"
                        })
                        .setDescriptionLocalizations({
                            hu: "Személy akit listához adsz/törölsz"
                        })
                )
        ),
    async execute(interaction, set_swear_words) {
        await interaction.deferReply({ ephemeral: true });
        set_swear_words(interaction);
    },
}