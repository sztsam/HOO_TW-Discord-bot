require('dotenv').config()
var MongoClient = require('mongodb').MongoClient;
var uuid = require('uuid');

var client = new MongoClient(process.env.DISCORD_BOT_MONGODB_URI);

module.exports = {
    main_db: "DISCORD_BOT_DATABASE",
    guilds: "GUILDS",
    base_config: "BASE_CONFIG",
    sample: {
        guild: {
            id: uuid.v1().slice(0, -13).replaceAll("-", ""),
            name: "",
            guild_id: "",
            pass: uuid.v4().slice(0, -13).replaceAll("-", ""),
            active: true,
            ban: false,
            ban_reason: "",
            market: "",
            config: {
                "swear_words_punishment": false,
                "ai_bot_chat_channels": [],
                "roles": [],
                "cronjobs": []
            },
        },
        base_config: {
            "roles": {
                "role_id": uuid.v1().slice(0, -13).replaceAll("-", ""),
                "channel_id": "",
                "message_id": "",
                "type": "",
                "roles": []
            },
            "role_in_roles": {
                "role_name": "",
                "emoji_id": "",
                "role_id": ""
            },
            "role_type": [
                "normal",
                "unique"
            ],
            "cron": {
                "cron_id": uuid.v1().slice(0, -13).replaceAll("-", ""),
                "time": "00 6 * * *",
                "type": "",
                "message": "",
                "channel_id": "",
                "onetime": false,
                "play": true
            },
            "cron_type": {
                "basic": [
                    "update_config",
                    "update_cached_data",
                    "update_map_data",
                    "update_daily_stats",
                    "update_live_servers",
                    "ennoblements",
                    "speed_table"
                ],
                "guild": [
                    "map",
                    "message",
                    "stat"
                ],
                "control": [
                    "start",
                    "stop",
                    "delete",
                    "modify",
                    "create"
                ]
            },
            "map_data": {
                village: {
                    type: "gz",
                    data: ["id", "name", "x", "y", "player", "points", "rank"]
                },
                player: {
                    type: "gz",
                    data: ["id", "name", "ally", "villages", "points", "rank"]
                },
                ally: {
                    type: "gz",
                    data: ["id", "name", "tag", "members", "villages", "points", "all_points", "rank"]
                },
                conquer: {
                    type: "gz",
                    data: ["village_id", "unix_timestamp", "new_owner", "old_owner"]
                },
                kill_att: {
                    type: "txt",
                    data: ["rank", "id", "kills"]
                },
                kill_def: {
                    type: "txt",
                    data: ["rank", "id", "kills"]
                },
                kill_sup: {
                    type: "txt",
                    data: ["rank", "id", "kills"]
                },
                kill_all: {
                    type: "txt",
                    data: ["rank", "id", "kills"]
                },
                kill_att_tribe: {
                    type: "txt",
                    data: ["rank", "id", "kills"]
                },
                kill_def_tribe: {
                    type: "txt",
                    data: ["rank", "id", "kills"]
                },
                kill_all_tribe: {
                    type: "txt",
                    data: ["rank", "id", "kills"]
                }
            },
            "map_pic_types": [
                "players_points",
                "players_oda",
                "players_odd",
                "tribes_points",
                "tribes_oda",
                "tribes_odd",
                "conquers_points"
            ],
            "chart_tribe_stats": {
                scope: [
                    "loot_res + scavenge",
                    "loot_res",
                    "scavenge",
                    "conquer",
                    "kill_att",
                    "kill_def",
                    "kill_sup",
                    "kill_all"
                ],
                size: [5, 10, 15, 20, 25],
                type: ["bar", "line", "pie", "violin"],
                style: ["individual", "stacked", "combined"],
                color: ["transparent", "black", "slategray", "white", "blue", "indigo", "teal", "darkgreen", "darkred"]
            },
            "translations": {
                "map_pic": {
                    "en": {
                        "players_points": "Players points",
                        "players_oda": "Players ODA",
                        "players_odd": "Players ODD",
                        "tribes_points": "Tribes points",
                        "tribes_oda": "Tribes ODA",
                        "tribes_odd": "Tribes ODD",
                        "conquers_points": "Conquers"
                    },
                    "hu": {
                        "players_points": "Játékos pontok",
                        "players_oda": "Játékos LET",
                        "players_odd": "Játékos LEV",
                        "tribes_points": "Klán pontok",
                        "tribes_oda": "Klán LET",
                        "tribes_odd": "Klán LEV",
                        "conquers_points": "Foglalások"
                    }
                },
                "chart": {
                    tribe_scope: {
                        en: {
                            "daily": {
                                "loot_res + scavenge": "farm + scavenge",
                                "loot_res": "farm",
                                "scavenge": "scavenge",
                                "conquer": "conquer",
                                "kill_att": "kill att",
                                "kill_def": "kill def",
                                "kill_sup": "kill sup",
                                "kill_all": "kill all"
                            },
                            "od": {
                                "kill_att": "kill att",
                                "kill_def": "kill def",
                                "kill_sup": "kill sup",
                                "kill_all": "kill all"
                            },
                            "conquer": "conquer"
                        },
                        hu: {
                            "daily": {
                                "loot_res + scavenge": "farm + gyűjtögetés",
                                "loot_res": "farm",
                                "scavenge": "gyűjtögetés",
                                "conquer": "foglalás",
                                "kill_att": "LET",
                                "kill_def": "LEV",
                                "kill_sup": "LES",
                                "kill_all": "LE"
                            },
                            "od": {
                                "kill_att": "LET",
                                "kill_def": "LEV",
                                "kill_sup": "LES",
                                "kill_all": "LE"
                            },
                            "conquer": "foglalás"
                        }
                    },
                    type: {
                        en: {
                            "bar": "bar",
                            "line": "line",
                            "pie": "pie",
                            "violin": "violin"
                        },
                        hu: {
                            "bar": "oszlop",
                            "line": "vonal",
                            "pie": "kör",
                            "violin": "eloszlás"
                        }
                    },
                    style: {
                        en: {
                            "individual": "individual",
                            "stacked": "stacked",
                            "combined": "combined"
                        },
                        hu: {
                            "individual": "egyéni",
                            "stacked": "halmozott",
                            "combined": "kombinált"
                        }
                    },
                    color: {
                        en: {
                            "transparent": "transparent",
                            "black": "black",
                            "slategray": "slategray",
                            "white": "white",
                            "blue": "blue",
                            "indigo": "indigo",
                            "teal": "teal",
                            "darkgreen": "darkgreen",
                            "darkred": "darkred"
                        },
                        hu: {
                            "transparent": "átlátszó",
                            "black": "fekete",
                            "slategray": "palaszürke",
                            "white": "fehér",
                            "blue": "kék",
                            "indigo": "indigó",
                            "teal": "kékeszöld",
                            "darkgreen": "sötétzöld",
                            "darkred": "sötétpiros"
                        }
                    },
                    error: {
                        en: {
                            "scope_error": "choosing scope is a must!",
                            "server_error": "choosing server is a must!",
                            "type_error": "choosing type is a must!"
                        },
                        hu: {
                            "scope_error": "hatókör választása kötelező!",
                            "server_error": "szerver választása kötelező!",
                            "type_error": "típus választása kötelező!"
                        }
                    },
                    title: {
                        en: {
                            "daily": "Daily",
                            "stat": "statistics",
                            "loot_res + scavenge": "farm + scavenge",
                            "loot_res": "farm",
                            "scavenge": "scavenge",
                            "conquer": "Conquer",
                            "kill_att": "ODA",
                            "kill_def": "ODD",
                            "kill_sup": "ODS",
                            "kill_all": "OD"
                        },
                        hu: {
                            "daily": "Napi",
                            "stat": "statisztika",
                            "loot_res + scavenge": "farm + gyűjtögetés",
                            "loot_res": "farm",
                            "scavenge": "gyűjtögetés",
                            "conquer": "foglalás",
                            "kill_att": "LET",
                            "kill_def": "LEV",
                            "kill_sup": "LES",
                            "kill_all": "LE"
                        }
                    },
                    dataset_label: {
                        en: {
                            "loot_res + scavenge": {
                                "individual": {
                                    "a": "farm",
                                    "b": "scavenge"
                                },
                                "stacked": {
                                    "a": "farm",
                                    "b": "scavenge"
                                },
                                "combined": {
                                    "sum": "farm + scavenge"
                                }
                            },
                            "loot_res": {
                                "combined": {
                                    "sum": "farm"
                                }
                            },
                            "scavenge": {
                                "combined": {
                                    "sum": "scavenge"
                                }
                            },
                            "conquer": {
                                "combined": {
                                    "sum": "conquer"
                                }
                            },
                            "kill_att": {
                                "combined": {
                                    "sum": "ODA"
                                }
                            },
                            "kill_def": {
                                "combined": {
                                    "sum": "ODD"
                                }
                            },
                            "kill_sup": {
                                "combined": {
                                    "sum": "ODS"
                                }
                            },
                            "kill_all": {
                                "individual": {
                                    "a": "ODA",
                                    "b": "ODD",
                                    "c": "ODS"
                                },
                                "stacked": {
                                    "a": "ODA",
                                    "b": "ODD",
                                    "c": "ODS"
                                },
                                "combined": {
                                    "sum": "ODA + ODD + ODS"
                                }
                            }
                        },
                        hu: {
                            "loot_res + scavenge": {
                                "individual": {
                                    "a": "farm",
                                    "b": "gyűjtögetés"
                                },
                                "stacked": {
                                    "a": "farm",
                                    "b": "gyűjtögetés"
                                },
                                "combined": {
                                    "sum": "farm + gyűjtögetés"
                                }
                            },
                            "loot_res": {
                                "combined": {
                                    "sum": "farm"
                                }
                            },
                            "scavenge": {
                                "combined": {
                                    "sum": "gyűjtögetés"
                                }
                            },
                            "conquer": {
                                "combined": {
                                    "sum": "foglalás"
                                }
                            },
                            "kill_att": {
                                "combined": {
                                    "sum": "LET"
                                }
                            },
                            "kill_def": {
                                "combined": {
                                    "sum": "LEV"
                                }
                            },
                            "kill_sup": {
                                "combined": {
                                    "sum": "LES"
                                }
                            },
                            "kill_all": {
                                "individual": {
                                    "a": "LET",
                                    "b": "LEV",
                                    "c": "LES"
                                },
                                "stacked": {
                                    "a": "LET",
                                    "b": "LEV",
                                    "c": "LES"
                                },
                                "combined": {
                                    "sum": "LET + LEV + LES"
                                }
                            }
                        }
                    }
                },
                "speed": {
                    en: {
                        "title": "Upcoming speed rounds",
                        "description": "Market | Number | Start - End | Speed"
                    },
                    hu: {
                        "title": "Tervezett speed körök",
                        "description": "Piac | Szám | Kezdet - Befejezés | Sebesség"
                    }
                },
                "ennoblements": {
                    "en": {
                        "barbarian": "Barbarian",
                        "nobled": "nobled",
                        "old_owner": "Old owner",
                        "channel": "Channel",
                        "play": "Play",
                        "command_message": {
                            "server": "Server error! Market may not be enabled, report an enhancement ticket!",
                            "tribe_error": "No such tribe exists on the server!",
                            "cron_id": "No ennoblement registered with this ID!",
                            "created": "Ennoblement notification created successfully",
                            "deleted": "Ennoblement notification deleted successfully",
                            "all_deleted": "All ennoblement notification deleted successfully",
                            "modified": "Ennoblement notification modified successfully",
                            "channel": "No ennoblement notification registered on this channel!",
                            "guild": "No ennoblement notification registered to this guild!",
                            "list_embed": {
                                "title": "Ennoblement notifications list",
                                "server": "Server",
                                "tribe": "Tribe",
                                "gain": "Gain",
                                "loss": "loss",
                                "self": "Self",
                                "internal": "Internal",
                                "barbarian": "Barbarian",
                                "continent": "Continent",
                                "channel": "Channel",
                                "play": "Play"
                            }
                        }
                    },
                    "hu": {
                        "barbarian": "Barbár",
                        "nobled": "elfoglalta",
                        "old_owner": "Régi tulajdonos",
                        "channel": "Csatorna",
                        "play": "Megy",
                        "command_message": {
                            "server": "Szerver hiba! Lehet a piac nincs engedélyezve, jelentsd ötletként!",
                            "tribe_error": "Nem létezik ilyen klán a szerveren!",
                            "cron_id": "Nincs foglalásjelző regisztrálva ezzel az ID-vel!",
                            "created": "Foglalásjelző sikeresen létrehozva",
                            "deleted": "Foglalásjelző sikeresen törölve",
                            "all_deleted": "Összes foglalásjelző sikeresen törölve",
                            "modified": "Foglalásjelző sikeresen módosítva",
                            "channel": "Nincs foglalásjelző regisztrálva erre a csatornára!",
                            "guild": "Nincs foglalásjelző regisztrálva erre a szerverre!",
                            "list_embed": {
                                "title": "Foglalásjelző lista",
                                "server": "Szerver",
                                "tribe": "klán",
                                "gain": "Nyereség",
                                "loss": "Veszteség",
                                "self": "Önhódítás",
                                "internal": "Belsőzés",
                                "barbarian": "Barbár",
                                "continent": "Kontinens",
                                "channel": "Csatorna",
                                "play": "Megy"
                            }
                        }
                    }
                },
                "help": {
                    "en": {
                        "error": "There was an error submitting your request. Please try again!",
                        "success": "request submitted successfully!",
                        "bug": "Bug",
                        "idea": "Idea"
                    },
                    "hu": {
                        "error": "Hiba történt a kérés elküldésében. Kérlek, próbáld meg újra!",
                        "success": "kérés sikeresen elküldve!",
                        "bug": "Hiba",
                        "idea": "Ötlet"
                    }
                }
            },
            "daily_stat_types": [
                "loot_res",
                "scavenge",
                "loot_vil",
                "kill_att",
                "kill_def",
                "kill_sup",
                "conquer"
            ],
            "ennoblements": {
                options: {
                    server: "",
                    tribe: "",
                    gain: false,
                    loss: false,
                    self: false,
                    internal: false,
                    barbarian: false,
                    continent: ""
                },
                colors: {
                    gain: "#4a9422", // green
                    loss: "#CB0E0E", // red
                    self: "#B51EBC", // purple
                    internal: "#111111", // black
                    barbarian: "#6a6b69" // grey
                }
            },
            "markets": [
                {
                    "market": "hu",
                    "link": ".klanhaboru.hu",
                    "twstat": "https://hu.twstats.com/",
                    "enabled": true,
                    "timezone": "+1"
                },
                {
                    "market": "en",
                    "link": ".tribalwars.net",
                    "twstat": "https://www.twstats.com/",
                    "enabled": false,
                    "timezone": "+0"
                },
                {
                    "market": "de",
                    "link": ".die-staemme.de",
                    "twstat": "https://de.twstats.com/",
                    "enabled": false,
                    "timezone": "+1"
                },
                {
                    "market": "ch",
                    "link": ".staemme.ch",
                    "twstat": "https://ch.twstats.com/",
                    "enabled": false,
                    "timezone": "+1"
                },
                {
                    "market": "nl",
                    "link": ".tribalwars.nl",
                    "twstat": "https://nl.twstats.com/",
                    "enabled": false,
                    "timezone": "+1"
                },
                {
                    "market": "pl",
                    "link": ".plemiona.pl",
                    "twstat": "https://pl.twstats.com/",
                    "enabled": false,
                    "timezone": "+1"
                },
                {
                    "market": "br",
                    "link": ".tribalwars.com.br",
                    "twstat": "https://br.twstats.com/",
                    "enabled": false,
                    "timezone": "+1"
                },
                {
                    "market": "pt",
                    "link": ".tribalwars.com.pt",
                    "twstat": "https://pt.twstats.com/",
                    "enabled": false,
                    "timezone": "+1"
                },
                {
                    "market": "cs",
                    "link": ".divokekmeny.cz",
                    "twstat": "https://cz.twstats.com/",
                    "enabled": false,
                    "timezone": "+1"
                },
                {
                    "market": "ro",
                    "link": ".triburile.ro",
                    "twstat": "https://ro.twstats.com/",
                    "enabled": false,
                    "timezone": "+1"
                },
                {
                    "market": "ru",
                    "link": ".voynaplemyon.com",
                    "twstat": "https://ru.twstats.com/",
                    "enabled": false,
                    "timezone": "+1"
                },
                {
                    "market": "gr",
                    "link": ".fyletikesmaxes.gr",
                    "twstat": "https://gr.twstats.com/",
                    "enabled": false,
                    "timezone": "+1"
                },
                {
                    "market": "sk",
                    "link": ".divoke-kmene.sk",
                    "twstat": "https://sk.twstats.com/",
                    "enabled": false,
                    "timezone": "+1"
                },
                {
                    "market": "it",
                    "link": ".tribals.it",
                    "twstat": "https://it.twstats.com/",
                    "enabled": false,
                    "timezone": "+1"
                },
                {
                    "market": "tr",
                    "link": ".klanlar.org",
                    "twstat": "https://tr.twstats.com/",
                    "enabled": false,
                    "timezone": "+1"
                },
                {
                    "market": "fr",
                    "link": ".guerretribale.fr",
                    "twstat": "https://fr.twstats.com/",
                    "enabled": false,
                    "timezone": "+1"
                },
                {
                    "market": "es",
                    "link": ".guerrastribales.es",
                    "twstat": "https://es.twstats.com/",
                    "enabled": false,
                    "timezone": "+1"
                },
                {
                    "market": "uk",
                    "link": ".tribalwars.co.uk",
                    "twstat": "https://www.twstats.co.uk/",
                    "enabled": false,
                    "timezone": "+1"
                },
                {
                    "market": "zz",
                    "link": ".tribalwars.works",
                    "twstat": "https://beta.twstats.com/",
                    "enabled": false,
                    "timezone": "+1"
                },
                {
                    "market": "us",
                    "link": ".tribalwars.us",
                    "twstat": "https://us.twstats.com/",
                    "enabled": false,
                    "timezone": "+1"
                }
            ],
            "bot_activity": {
                "name": ["HOO", "Klánháború", "ASG Királya", "ASG", "Barcsag", "ARMA", "Védekezés", "PP bank", "Megbeszélés", "Discord", "Asgardia Rejtelmei", "Asgard törvénykönyv", "Vegyetek pp-t gyerekek!"],
                "type": ["Playing", "Streaming", "Listening", "Watching", "Custom", "Competing"],
                "status": ["online", "idle", "dnd"]
            },
            "swear_words": {
                "words": ["fasz"],
                "react_emojis": ["973864597700374558", "973864726201266206", "973864712435552276", "973864672266694696", "973864613772951572", "973864581388718150", "973864566918352906", "973864533015801856", "👀", "🙄"]
            },
            "dev_channels": {
                "prod_errors": "1088405030631129130",
                "bugs": "1090590497417998418",
                "idea": "1090590531303780422"
            },
            "running_servers": [],
            "running_servers_continents": {},
            "basic_cronjobs": [],
            "prefix": "¤"
        }
    },
    item_not_exist: [null, "NaN", "undefined", undefined],
    CONNECT: async function () {
        try {
            await client.connect();
            console.log("Connected successfully to database");
        }
        catch (e) {
            console.error(e);
        }
    },
    CLOSE: async function () {
        await client.close();
    },
    SETUP_DATABASE: async function () {
        this.main_db = client.db(this.main_db);
        this.guilds = this.main_db.collection(this.guilds);
        if (await this.guilds.countDocuments() < 1) {
            this.guilds.insertOne(this.sample.guild)
        }
        this.base_config = this.main_db.collection(this.base_config);
        if (await this.base_config.countDocuments() < 1) {
            let temp_config = [];
            temp_config.push({ name: "sample_guild", value: this.sample.guild });
            Object.keys(this.sample.base_config).forEach(key => temp_config.push({ name: key, value: this.sample.base_config[key] }))
            this.base_config.insertMany(temp_config)
        }
    },
    GET_BASE_CONFIG: async function (type) {
        let options = {
            projection: { _id: 0 }
        }
        let config;
        switch (type) {
            case "all":
                config = await this.base_config.find({}, options).toArray();
                let config_object = {};
                config.forEach(item => config_object[item.name] = item.value)
                return config_object;
            default:
                config = (await this.base_config.find({ name: type }, options).toArray())[0]?.value;
                return config;
        }
    },
    GET_GUILDS_CONFIG: async function () {
        return await this.guilds.find().toArray();
    },
    UPDATE_BASE_CONFIG: async function (type, data) {
        this.base_config.updateOne({ name: type }, { $set: { value: data } });
        return {
            status: "OK",
            message: `Updated base configuration: ${type}`
        }
    },
    ADD_CRONJOB_TO_BASE_CONFIG: async function (data) {
        if (data.time === undefined || data.type === undefined) { return { status: false } }
        var basic_cronjobs = (await this.base_config.find({ name: "basic_cronjobs" }).toArray())[0];
        let cron_data = this.sample.base_config.cron;
        cron_data.cron_id = uuid.v1().slice(0, -13).replaceAll("-", "");
        cron_data.time = data.time === undefined ? cron_data.time : data.time;
        cron_data.type = data.type === undefined ? cron_data.type : data.type;
        cron_data.message = data.message === undefined ? cron_data.message : data.message;
        cron_data.channel_id = data.channel_id === undefined ? cron_data.channel_id : data.channel_id;
        cron_data.onetime = data.onetime === undefined ? cron_data.onetime : data.onetime;
        cron_data.play = data.play === undefined ? cron_data.play : data.play;
        basic_cronjobs.value.push(cron_data);
        await this.base_config.updateOne({ name: "basic_cronjobs" }, { $set: { value: basic_cronjobs.value } });
        return cron_data;
    },
    FIND_GUILD: async function (guild_id) {
        var options = {
            guild_id: guild_id,
        };
        var found_guild = await this.guilds.find(options).toArray();
        return found_guild;
    },
    CREATE_GUILD: async function (data) {
        const guild_exist = ((await this.FIND_GUILD(data.guild_id)).length);
        if (guild_exist < 1) {
            const errors = [];
            if (this.item_not_exist.includes(data.guild_id)) { errors.push("Guild ID error") }
            if (this.item_not_exist.includes(data.market)) { errors.push("Market error") }
            if (errors.length > 0) {
                return {
                    status: "error",
                    message: errors
                };
            }
            const new_data = await this.GET_BASE_CONFIG("sample_guild");
            new_data.id = uuid.v1().slice(0, -13).replaceAll("-", "");
            new_data.guild_id = data.guild_id;
            new_data.name = data.guild_name;
            data.pass?.length > 4 ? new_data.pass = data.pass : new_data.pass = uuid.v4().slice(0, -13).replaceAll("-", "");
            new_data.market = data.market.length > 2 ? data.market.substring(0, 2) : data.market;
            await this.guilds.insertOne(new_data);
            return {
                status: "OK",
                message: {
                    status: "Guild created successfully",
                    pass: new_data.pass
                }
            };
        }
        else {
            await this.ACTIVE(data);
            return {
                status: "OK",
                message: "Guild already exist / reactivated successfully"
            };
        }
    },
    BAN: async function (data) {
        if (typeof (data.ban) !== "boolean" || data.user.username !== process.env.DISCORD_BOT_ADMIN) { return; }
        await this.guilds.updateMany({ guild_id: data.guild_id }, { $set: { ban: data.ban, ban_reason: data.reason } });
        console.log(`${data.ban ? "Banned" : "Unbanned"} [${data.guild_id} - ${data.guild_name}]: ${data.reason}`);
    },
    ACTIVE: async function (data) {
        if (typeof (data.active) !== "boolean") { return; }
        await this.guilds.updateMany({ guild_id: data.guild_id }, { $set: { active: data.active } });
        console.log(`${data.active ? "Activated" : "Deactivated"} [${data.guild_id}]: ${data.guild_name}`);
    },
    GET_GUILD_DATA: async function (id, pass) {
        var options = {
            guild_id: id,
            pass: pass
        };
        var found_guild = (await this.guilds.find(options).toArray())[0];
        return {
            status: found_guild ? "OK" : "ERROR",
            guild_id: found_guild.guild_id ? found_guild.guild_id : null,
            pass: found_guild.pass ? found_guild.pass : null,
            market: found_guild.market ? found_guild.market : null,
            config: found_guild.config ? found_guild.config : null
        };
    },
    UPDATE_GUILD_CONFIG: async function (type, data, action) {
        let guild = (await this.FIND_GUILD(data.guild_id))[0];
        if (!guild) {
            const guild_created = await this.CREATE_GUILD(data);
            if (guild_created.status === "error") {
                return {
                    status: "error",
                    message: guild_created.message
                };
            }
            else {
                guild = (await this.FIND_GUILD(data.guild_id))[0];
            }
        }
        if (guild.ban) {
            return {
                status: "error",
                message: "Guild is banned"
            };
        }

        switch (type) {
            case "config":
                this.guilds.updateOne({ id: data.id }, { $set: { config: data.config } });
                return {
                    status: "OK",
                    message: `Updated guild configuration for ${data.name} ${data.id}`
                }
            case "guild_id":
                if (!data?.new_guild_id) { return; }
                this.guilds.updateOne({ guild_id: data.guild_id }, { $set: { guild_id: data.new_guild_id } });
                break;
            case "pass":
                if (!data?.pass || data.pass?.length < 6) { return; }
                this.guilds.updateOne({ guild_id: data.guild_id }, { $set: { pass: data.pass } });
                break;
            case "market":
                const base_markets = await this.GET_BASE_CONFIG("market");
                const markets_array = base_markets.map(market => market.market);
                if (!markets_array.includes(data.market)) { return; }
                this.guilds.updateOne({ guild_id: data.guild_id }, { $set: { market: data.market } });
                break;
            case "swear_words_punishment":
                if (typeof data.swear_words_punishment !== "boolean") { return; }
                const swear_words_punishment = guild.config.swear_words_punishment;
                if (swear_words_punishment === data.swear_words_punishment) {
                    return `Swear words punishment is already set to ${data.swear_words_punishment} in guild ${data.guild_id}!`;
                }
                await this.guilds.updateOne({ guild_id: data.guild_id }, { $set: { "config.swear_words_punishment": data.swear_words_punishment } });
                return `Swear words punishment is set to ${data.swear_words_punishment} in guild ${data.guild_id}!`;
            case "ai_bot_chat_channels":
                const ai_bot_chat_channels = guild.config.ai_bot_chat_channels;
                switch (action) {
                    case "add":
                        if (!ai_bot_chat_channels.includes(data.channel_id)) {
                            ai_bot_chat_channels.push(data.channel_id);
                            await this.guilds.updateOne({ guild_id: data.guild_id }, { $set: { "config.ai_bot_chat_channels": ai_bot_chat_channels } });
                            return `Channel ${data.channel_id} added to AI bot chat channels successfully`;
                        }
                        return `Channel ${data.channel_id} is already in AI bot chat channels!`;
                    case "remove":
                        if (ai_bot_chat_channels.includes(data.channel_id)) {
                            ai_bot_chat_channels.splice(ai_bot_chat_channels.indexOf(data.channel_id), 1);
                            await this.guilds.updateOne({ guild_id: data.guild_id }, { $set: { "config.ai_bot_chat_channels": ai_bot_chat_channels } });
                            return `Channel ${data.channel_id} removed from AI bot chat channels successfully`;
                        }
                        return `Channel ${data.channel_id} is not in AI bot chat channels!`;
                }
                break;
            case "roles":
                const role_data = guild.config.roles.filter(role => role.role_id === data.role_id)[0];
                const role_index = guild.config.roles.indexOf(role_data);
                switch (action) {
                    case "create":
                        if (!data.channel_id || !data.message_id || !data.type) { return; }
                        const base_roles_data = await this.GET_BASE_CONFIG("roles");
                        base_roles_data.role_id = uuid.v1().slice(0, -13).replaceAll("-", "");
                        base_roles_data.channel_id = data.channel_id;
                        base_roles_data.message_id = data.message_id;
                        base_roles_data.type = data.type;
                        guild.config.roles.push(base_roles_data);
                        this.guilds.updateOne({ guild_id: data.guild_id }, { $set: { "config.roles": guild.config.roles } });
                        break;
                    case "delete":
                        if (!role_data) { return; }
                        guild.config.roles.splice(role_index, 1);
                        this.guilds.updateOne({ guild_id: data.guild_id }, { $set: { "config.roles": guild.config.roles } });
                        break;
                    case "modify":
                        if (!role_data) { return; }
                        data.channel_id.length ? guild.config.roles[role_index].channel_id = data.channel_id : null;
                        data.message_id.length ? guild.config.roles[role_index].message_id = data.message_id : null;
                        data.type.length ? guild.config.roles[role_index].type = data.type : null;
                        this.guilds.updateOne({ guild_id: data.guild_id }, { $set: { "config.roles": guild.config.roles } });
                        break;
                }
                break;
            case "role_in_roles":
                const role_in_roles_data = guild.config.roles.filter(role => role.message_id === data.message_id)[0];
                if (!role_in_roles_data) { return; }
                const role_in_roles = role_in_roles_data.roles.filter(role => role.role_id === data.role_id)[0];
                switch (action) {
                    case "add":
                        if (role_in_roles) { return; }
                        const base_role_in_roles_data = await this.GET_BASE_CONFIG("role_in_roles");
                        base_role_in_roles_data.role_name = data.role_name;
                        base_role_in_roles_data.emoji_id = data.emoji_id;
                        base_role_in_roles_data.role_id = data.role_id;
                        guild.config.roles.filter(role => role.message_id === data.message_id)[0].roles.push(base_role_in_roles_data);
                        this.guilds.updateOne({ guild_id: data.guild_id }, { $set: { "config.roles": guild.config.roles } });
                        break;
                    case "delete":
                        if (!role_in_roles) { return; }
                        const role_to_remove_index = role_in_roles_data.roles.indexOf(role_in_roles);
                        role_in_roles_data.roles.splice(role_to_remove_index, 1);
                        this.guilds.updateOne({ guild_id: data.guild_id }, { $set: { "config.roles": guild.config.roles } });
                        break;
                    case "modify":
                        if (!role_in_roles) { return; }
                        data.role_name.length ? role_in_roles.role_name = data.role_name : null;
                        data.emoji_id.length ? role_in_roles.emoji_id = data.emoji_id : null;
                        data.role_id.length ? role_in_roles.role_id = data.role_id : null;
                        this.guilds.updateOne({ guild_id: data.guild_id }, { $set: { "config.roles": guild.config.roles } });
                        break;
                }
                break;
            case "cronjobs":
                const cron_data = guild.config.cronjobs.filter(cron => cron.cron_id === data.cron_id)[0];
                const cron_index = guild.config.cronjobs.indexOf(cron_data);
                switch (action) {
                    case "start":
                        if (!cron_data) { return; }
                        cron_data.start = true;
                        this.guilds.updateOne({ guild_id: data.guild_id }, { $set: { "config.cronjobs": guild.config.cronjobs } });
                        break;
                    case "stop":
                        if (!cron_data) { return; }
                        cron_data.start = false;
                        this.guilds.updateOne({ guild_id: data.guild_id }, { $set: { "config.cronjobs": guild.config.cronjobs } });
                        break;
                    case "create":
                        if (!data.time || !data.type || !data.channel_id) { return; }
                        const base_cronjobs_data = await this.GET_BASE_CONFIG("cron");
                        base_cronjobs_data.cron_id = uuid.v1().slice(0, -13).replaceAll("-", "");
                        base_cronjobs_data.time = data.time;
                        base_cronjobs_data.type = data.type;
                        base_cronjobs_data.message = data.message.toString().length ? data.message : base_cronjobs_data.message;
                        base_cronjobs_data.channel_id = data.channel_id;
                        base_cronjobs_data.onetime = data.onetime.length ? data.onetime : base_cronjobs_data.onetime;
                        base_cronjobs_data.play = data.play.toString().length ? data.play : base_cronjobs_data.play;
                        guild.config.cronjobs.push(base_cronjobs_data);
                        await this.guilds.updateOne({ guild_id: data.guild_id }, { $set: { "config.cronjobs": guild.config.cronjobs } });
                        return base_cronjobs_data;
                    case "delete":
                        if (!cron_data) { return; }
                        guild.config.cronjobs.splice(cron_index, 1);
                        await this.guilds.updateOne({ guild_id: data.guild_id }, { $set: { "config.cronjobs": guild.config.cronjobs } });
                        break;
                    case "modify":
                        if (!cron_data) { return; }
                        data.time.length ? guild.config.cronjobs[cron_index].time = data.time : null;
                        data.type.length ? guild.config.cronjobs[cron_index].type = data.type : null;
                        data.message.toString().length ? guild.config.cronjobs[cron_index].message = data.message : null;
                        data.channel_id.length ? guild.config.cronjobs[cron_index].channel_id = data.channel_id : null;
                        data.onetime.toString().length ? guild.config.cronjobs[cron_index].onetime = data.onetime : null;
                        data.play.toString().length ? guild.config.cronjobs[cron_index].play = data.play : null;
                        await this.guilds.updateOne({ guild_id: data.guild_id }, { $set: { "config.cronjobs": guild.config.cronjobs } });
                        return guild.config.cronjobs[cron_index];
                }
                break;
        }
    },
    START: async function () {
        await this.CONNECT();
        await this.SETUP_DATABASE();
    }
}