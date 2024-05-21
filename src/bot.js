require("dotenv").config();
const child_process = require("child_process");
const https = require("https");
const fs = require("fs");
const zlib = require("zlib");
const decompress = require("decompress");
const CronJob = require("cron").CronJob;
const axios = require("axios");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const canvas = require("canvas");
const { ChartJSNodeCanvas, CanvasRenderService } = require("chartjs-node-canvas");
const Chart = require("chart.js");
const ChartDataLabels = require("chartjs-plugin-datalabels");
const ChartAutoColors = require("chartjs-plugin-colorschemes");
require("@sgratzl/chartjs-chart-boxplot");
const { Client, Collection, Events, GatewayIntentBits, PermissionsBitField, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ActivityType, REST, Routes, ChannelType } = require("discord.js");

const DEV = false;
const BOT_TOKEN = DEV ? process.env.DISCORDJS_DEV_BOT_TOKEN : process.env.DISCORDJS_BOT_TOKEN;
const BOT_CLIENT_ID = DEV ? process.env.DISCORDJS_DEV_BOT_CLIENT_ID : process.env.DISCORDJS_BOT_CLIENT_ID;
const BOT_GUILD_ID = DEV ? process.env.DISCORDJS_DEV_GUILD_ID : process.env.DISCORDJS_OWN_GUILD_ID;

global.CanvasGradient = canvas.CanvasGradient;
Chart.plugins.register(ChartDataLabels);
Chart.plugins.register(ChartAutoColors);
const discordClient = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildEmojisAndStickers,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessageTyping,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.DirectMessageTyping
	]
});
discordClient.commands = new Collection();
const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
const mongodb = require(`${require.main.path}/mongodb.js`);
const botSettings = {
	base_config: {},
	guilds_config: [],
	cronjobs: {
		basic_cronjobs: {},
		guild_cronjobs: {}
	}
};
const lock = {
	base_config: false,
	guilds_config: false,
	cronjobs: false,
	cache: false
};
const helper = {
	translation_locale: function (module, locale, preferred_locale) {
		const locale_short = locale.substring(0, 2);
		return botSettings.base_config.translations[module][locale_short] ? locale_short : "en";
	},
	sleep: function (ms) {
		return new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
	}
};

function init_locations() {
	botSettings.locations = {
		cache: `${require.main.path}/files_cache/`,
		init: function () {
			for (const type in botSettings.base_config.map_data) {
				this[`map_${type}`] = `${this.cache}map_${type}/`;
			}
			this.daily_stats = `${this.cache}daily_stats/`;
			return this;
		}
	}.init();
	for (const location in botSettings.locations) {
		if (location !== "init") {
			if (!fs.existsSync(botSettings.locations[location])) {
				fs.mkdirSync(botSettings.locations[location]);
				console.log(`Folder '${botSettings.locations[location]}' created successfully.`);
			}
		}
	}
}
async function init_cache() {
	botSettings.cache = {
		daily_stats: {},
		init: function () {
			for (const type in botSettings.base_config.map_data) {
				this[`map_${type}`] = {};
			}
			return this;
		}
	}.init();

	await update_cached_data();
}
async function update_config() {
	const updated_base_config = DEV ? mongodb.sample.base_config : await mongodb.GET_BASE_CONFIG("all");
	const updated_guilds_config = DEV ? await mongodb.FIND_GUILD(BOT_GUILD_ID) : await mongodb.GET_GUILDS_CONFIG();
	botSettings.base_config = updated_base_config;
	botSettings.guilds_config = updated_guilds_config;
}
async function update_cached_data(type) {
	delete_unused_files();
	let folder;
	let server;
	let data;
	switch (type) {
		case "map":
			const types = Object.keys(botSettings.base_config.map_data).map(type => `map_${type}`);
			for (const type of types) {
				folder = fs.readdirSync(botSettings.locations[type]);
				for (const file of folder) {
					server = file.split(".")[0];
					try {
						data = fs.readFileSync(`${botSettings.locations[type]}${file}`, "utf8").split("\n").filter(line => line.trim().length > 0);
						botSettings.cache[type][server] = data;
					} catch (error) { }
				}
			}
			break;
		case "stats":
			folder = fs.readdirSync(botSettings.locations["daily_stats"]);
			for (const file of folder) {
				server = file.split(".")[0];
				try {
					data = JSON.parse(fs.readFileSync(`${botSettings.locations["daily_stats"]}${file}`, "utf8"));
					botSettings.cache["daily_stats"][server] = data;
				} catch (error) { }
			}
			break;
		default:
			await update_cached_data("map");
			await update_cached_data("stats");
			break;
	}
}
function delete_unused_files() {
	const enabled_markets = botSettings.base_config.markets.filter(market => market.enabled === true).map(market => market.market);
	for (const location in botSettings.locations) {
		if (location !== "init" && location !== "cache") {
			const files = fs.readdirSync(botSettings.locations[location]);
			files.forEach((file) => {
				if (!botSettings.base_config.running_servers.includes(file.split(".")[0]) || !enabled_markets.includes(file.substring(0, 2))) {
					fs.unlinkSync(`${botSettings.locations[location]}${file}`);
					console.log(`${file} deleted. server no longer running`);
				}
			})
		}
		else { }
	}
}
discordClient.once(Events.ClientReady, async () => {
	console.log(`${discordClient.user.tag} has logged in.`);
	bot_activity_change();
	add_reactions_to_roles();
	slash_commands();
});
discordClient.on(Events.MessageCreate, async (message) => {
	if (message.author.bot) return;
	const guild = botSettings.guilds_config.find(guild => guild.guild_id === message.guildId);
	if (!guild) { return; }
	swear_words_punishment(message);
	show_info_tribal_data(false, message, guild);
	if (guild.config.ai_bot_chat_channels.includes(message.channelId)) { ai_chatting(guild.market, message); return; }
	if (message.content.toLowerCase().includes("hoo")) { ai_chatting(guild.market, message); }
	if (message.content.startsWith(botSettings.base_config.prefix)) {
		console.log(message.content)
		const [CMD_NAME, ...args] = message.content
			.trim()
			.substring(botSettings.base_config.prefix.length)
			.split(/\s+/);
		if (CMD_NAME === 'kick') {
			if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers))
				return message.reply('You do not have permissions to use that command');
			if (args.length === 0)
				return message.reply('Please provide an ID');
			const member = message.guild.members.cache.get(args[0]);
			if (member) {
				member
					.kick()
					.then((member) => message.channel.send(`${member} was kicked.`))
					.catch((err) => message.channel.send('I cannot kick that user :('));
			} else {
				message.channel.send('That member was not found');
			}
		} else if (CMD_NAME === 'ban') {
			if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
				return message.reply("You do not have permissions to use that command");
			if (args.length === 0) return message.reply("Please provide an ID");
			try {
				const user = await message.guild.members.ban(args[0]);
				message.channel.send('User was banned successfully');
			} catch (err) {
				console.log(err);
				message.channel.send('An error occured. Either I do not have permissions or the user was not found');
			}
		}
	}
});
discordClient.on(Events.MessageReactionAdd, async (reaction, user) => {
	return;
	if (reaction.message.partial) await reaction.message.fetch();
	if (reaction.partial) await reaction.fetch();
	if (user.bot) return;
	if (!reaction.message.guild) return;
	const { name } = reaction.emoji;
	const member = reaction.message.guild.members.cache.get(user.id);

	for (let a = 0; a < botOptions.roles.length; a++) {

		const msg = await discordClient.channels.cache.get(botOptions.roles[a].channel_id).messages.fetch(botOptions.roles[a].message_id);
		if (reaction.message.id === botOptions.roles[a].message_id) {
			switch (botOptions.roles[a].type) {
				case "normal":
					for (let i = 0; i < botOptions.roles[a].roles.length; i++) {
						if (name === botOptions.roles[a].roles[i].name) {
							try {
								await member.roles.add(botOptions.roles[a].roles[i].id);
							}
							catch (err) { }
							break;
						}
					}
					break;
				case "unique":
					for (let i = 0; i < botOptions.roles[a].roles.length; i++) {
						if (name === botOptions.roles[a].roles[i].name) {
							try {
								await member.roles.add(botOptions.roles[a].roles[i].id);
							}
							catch (err) { }
						}
						if (name !== botOptions.roles[a].roles[i].name) {
							try {
								await member.roles.remove(botOptions.roles[a].roles[i].id);
								//msg.reactions.resolve(botOptions.roles[a].roles[i].name)?.users?.remove(member);
							}
							catch (err) { }
						}
					}
					break;
			}
			break;
		}
	}
});
discordClient.on(Events.MessageReactionRemove, async (reaction, user) => {
	return;
	if (reaction.message.partial) await reaction.message.fetch();
	if (reaction.partial) await reaction.fetch();
	if (user.bot) return;
	if (!reaction.message.guild) return;
	const { name } = reaction.emoji;
	const member = reaction.message.guild.members.cache.get(user.id);
	for (let a = 0; a < botOptions.roles.length; a++) {
		if (reaction.message.id === botOptions.roles[a].message_id) {
			for (let i = 0; i < botOptions.roles[a].roles.length; i++) {
				if (name === botOptions.roles[a].roles[i].name) {
					try {
						await member.roles.remove(botOptions.roles[a].roles[i].id);
					}
					catch (err) { }
					break;
				}
			}
			break;
		}
	}
});
discordClient.on(Events.InteractionCreate, async (interaction) => {
	if (interaction.user.bot) { return; }
	if (interaction.isChatInputCommand()) {
		const command = interaction.client.commands.get(interaction.commandName);
		if (!command) {
			interaction.reply({ content: `No registered command with this name!`, ephemeral: true });
			return;
		}
		try {
			switch (interaction.commandName) {
				case "guild_settings":
					command.execute(interaction, set_guild_settings);
					break;
				case "ping":
					command.execute(discordClient, interaction);
					break;
				case "info":
					command.execute(interaction, show_info_tribal_data);
					break;
				case "coord_info":
					command.execute(interaction, set_coord_info);
					break;
				case "stat":
					command.execute(interaction, generate_tribe_chart);
					break;
				case "map":
					command.execute(interaction, get_generated_map);
					break;
				case "ennoblements":
					command.execute(interaction, set_ennoblements);
					break;
				case "swear_words":
					command.execute(interaction, set_swear_words);
					break;
				case "help":
					command.execute(interaction, help_handler);
					break;
				case "bot_control":
					command.execute(interaction, bot_control);
					break;
				case "bot_presence":
					command.execute(interaction, bot_activity_change);
					break;
			}
		}
		catch (error) {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
	else if (interaction.isAutocomplete()) {
		const enabled_markets = botSettings.base_config.markets.filter(market => market.enabled === true).map(market => market.market);
		const sub_command = interaction.options._subcommand !== null ? interaction.options.getSubcommand() : "";
		const focused_option = interaction.options.getFocused(true);
		const hoisted_options = interaction.options._hoistedOptions;
		const interaction_guild = botSettings.guilds_config.find(guild => guild.guild_id === interaction.guildId) ?? undefined;
		let use_locale, choices, filtered_choices, final_choices, option;
		if (interaction.commandName === "stat") {
			use_locale = helper.translation_locale("chart", interaction.locale);
			switch (focused_option.name) {
				case "scope":
					choices = botSettings.base_config.translations.chart[use_locale]["tribe_scope"][sub_command];
					filtered_choices = Object.fromEntries(Object.entries(choices).filter(([key, value]) => value.startsWith(focused_option.value)));
					final_choices = Object.fromEntries(Object.entries(filtered_choices).slice(0, 20));
					break;
				case "server":
					switch (sub_command === "daily") {
						case true:
							choices = fs.readdirSync(botSettings.locations.daily_stats).map(file => file.split(".")[0]);
							break;
						case false:
							choices = (await botSettings.base_config.running_servers).filter(server => enabled_markets.includes(server.substring(0, 2)));
							break;
					}
					filtered_choices = choices.filter(choice => choice.startsWith(focused_option.value)).splice(0, 20);
					final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
					break;
				case "size":
					choices = botSettings.base_config.chart_tribe_stats.size;
					final_choices = choices.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
					break;
				case "player":
					try {
						option = hoisted_options.filter(option => option.name === "server")[0].value;
						choices = botSettings.cache.map_player[option].sort(sort_player_by_rank).map(player => { return { id: `${player.split(",")[botSettings.base_config.map_data.player.data.indexOf("id")]}`, name: decodeURIComponent(`${player.split(",")[botSettings.base_config.map_data.player.data.indexOf("name")]}`.replaceAll("+", " ")) } });
						filtered_choices = choices.filter(choice => choice.name.startsWith(focused_option.value)).splice(0, 20);
						final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.name }), {});
					}
					catch (error) {
						filtered_choices = { ["server_error"]: botSettings.base_config.translations.chart[use_locale]["error"]["server_error"] };
						final_choices = filtered_choices;
					}
					break;
				case "ally":
					try {
						option = hoisted_options.filter(option => option.name === "server")[0].value;
						choices = botSettings.cache.map_ally[option].sort(sort_ally_by_rank).map(ally => decodeURIComponent(`${ally.split(",")[botSettings.base_config.map_data.ally.data.indexOf("tag")]}`.replaceAll("+", " ")));
						filtered_choices = focused_option.value.split("&").length > 1 ?
							choices.filter(ally => ally.startsWith(focused_option.value.split("&").pop())).map(item => `${focused_option.value.split("&").slice(0, -1).join("&")}&${item}`).splice(0, 20)
							: choices.filter(choice => choice.startsWith(focused_option.value)).splice(0, 20);
						final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
					}
					catch (error) {
						filtered_choices = { ["server_error"]: botSettings.base_config.translations.chart[use_locale]["error"]["server_error"] };
						final_choices = filtered_choices;
					}
					break;
				case "enemy":
					try {
						option = hoisted_options.filter(option => option.name === "server")[0].value;
						choices = botSettings.cache.map_ally[option].sort(sort_ally_by_rank).map(ally => decodeURIComponent(`${ally.split(",")[botSettings.base_config.map_data.ally.data.indexOf("tag")]}`.replaceAll("+", " ")));
						filtered_choices = focused_option.value.split("&").length > 1 ?
							choices.filter(ally => ally.startsWith(focused_option.value.split("&").pop())).map(item => `${focused_option.value.split("&").slice(0, -1).join("&")}&${item}`).splice(0, 20)
							: choices.filter(choice => choice.startsWith(focused_option.value)).splice(0, 20);
						final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
					}
					catch (error) {
						filtered_choices = { ["server_error"]: botSettings.base_config.translations.chart[use_locale]["error"]["server_error"] };
						final_choices = filtered_choices;
					}
					break;
				case "type":
					choices = botSettings.base_config.translations.chart[use_locale]["type"];
					final_choices = choices;
					break;
				case "style":
					choices = botSettings.base_config.translations.chart[use_locale]["style"];
					final_choices = choices;
					break;
				case "color":
					choices = botSettings.base_config.translations.chart[use_locale]["color"];
					final_choices = choices;
					break
			}
		}
		else if (interaction.commandName === "info") {
			use_locale = helper.translation_locale("info", interaction.locale);
			option = hoisted_options?.filter(option => option.name === "server")[0]?.value ?? interaction_guild?.global_world;
			switch (focused_option.name) {
				case "server":
					choices = (await botSettings.base_config.running_servers).filter(server => enabled_markets.includes(server.substring(0, 2)));
					filtered_choices = choices.filter(choice => choice.startsWith(focused_option.value)).splice(0, 20);
					final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
					break;
				case "player":
					if (!option) {
						filtered_choices = { ["server_error"]: botSettings.base_config.translations.info[use_locale]["server_error"] };
						final_choices = filtered_choices;
					}
					else {
						choices = botSettings.cache.map_player[option].sort(sort_player_by_rank).map(player => { return { id: `${player.split(",")[botSettings.base_config.map_data.player.data.indexOf("id")]}`, name: decodeURIComponent(`${player.split(",")[botSettings.base_config.map_data.player.data.indexOf("name")]}`.replaceAll("+", " ")) } });
						filtered_choices = choices.filter(choice => choice.name.startsWith(focused_option.value)).splice(0, 20);
						final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.name }), {});
					}
					break;
				case "ally":
					if (!option) {
						filtered_choices = { ["server_error"]: botSettings.base_config.translations.info[use_locale]["server_error"] };
						final_choices = filtered_choices;
					}
					else {
						choices = botSettings.cache.map_ally[option].sort(sort_ally_by_rank).map(ally => { return { id: `${ally.split(",")[botSettings.base_config.map_data.ally.data.indexOf("id")]}`, name: decodeURIComponent(`${ally.split(",")[botSettings.base_config.map_data.ally.data.indexOf("tag")]}`.replaceAll("+", " ")) } });
						filtered_choices = choices.filter(choice => choice.name.startsWith(focused_option.value)).splice(0, 20);
						final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.name }), {});
					}
					break;
			}
		}
		else if (interaction.commandName === "coord_info") {
			use_locale = helper.translation_locale("coord_info", interaction.locale);
			option = hoisted_options?.filter(option => option.name === "server")[0]?.value ?? interaction_guild?.global_world;
			switch (focused_option.name) {
				case "server":
					choices = (await botSettings.base_config.running_servers).filter(server => enabled_markets.includes(server.substring(0, 2)));
					filtered_choices = choices.filter(choice => choice.startsWith(focused_option.value)).splice(0, 20);
					final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
					break;
			}
		}
		else if (interaction.commandName === "map") {
			use_locale = helper.translation_locale("map_pic", interaction.locale);
			switch (focused_option.name) {
				case "server":
					choices = (await botSettings.base_config.running_servers).filter(server => enabled_markets.includes(server.substring(0, 2)));
					filtered_choices = choices.filter(choice => choice.startsWith(focused_option.value)).splice(0, 20);
					final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
					break;
				case "type":
					choices = botSettings.base_config.translations.map_pic[use_locale];
					final_choices = choices;
					break;
			}
		}
		else if (interaction.commandName === "ennoblements") {
			use_locale = helper.translation_locale("ennoblements", interaction.locale);
			switch (focused_option.name) {
				case "server":
					choices = (await botSettings.base_config.running_servers).filter(server => enabled_markets.includes(server.substring(0, 2)));
					filtered_choices = choices.filter(choice => choice.startsWith(focused_option.value)).splice(0, 20);
					final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
					break;
				case "tribe":
					try {
						option = hoisted_options.filter(option => option.name === "server")[0].value;
						choices = botSettings.cache.map_ally[option].sort(sort_ally_by_rank).map(ally => decodeURIComponent(`${ally.split(",")[botSettings.base_config.map_data.ally.data.indexOf("tag")]}`.replaceAll("+", " ")));
						filtered_choices = focused_option.value.split("&").length > 1 ?
							["all"].concat(choices.filter(ally => ally.startsWith(focused_option.value.split("&").pop())).map(item => `${focused_option.value.split("&").slice(0, -1).join("&")}&${item}`).splice(0, 19))
							: ["all"].concat(choices.filter(choice => choice.startsWith(focused_option.value)).splice(0, 19));
						final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
					}
					catch (error) {
						if (sub_command === "modify") {
							try {
								option = botSettings.guilds_config.flatMap(guild => guild.config.cronjobs.find(cron => cron.cron_id === hoisted_options.find(option => option.name === "id").value) || [])[0].message[0];
								choices = botSettings.cache.map_ally[option].sort(sort_ally_by_rank).map(ally => decodeURIComponent(`${ally.split(",")[botSettings.base_config.map_data.ally.data.indexOf("tag")]}`.replaceAll("+", " ")));
								filtered_choices = focused_option.value.split("&").length > 1 ?
									["all"].concat(choices.filter(ally => ally.startsWith(focused_option.value.split("&").pop())).map(item => `${focused_option.value.split("&").slice(0, -1).join("&")}&${item}`).splice(0, 19))
									: ["all"].concat(choices.filter(choice => choice.startsWith(focused_option.value)).splice(0, 19));
								final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
							}
							catch (err) {
								filtered_choices = { ["cron_id"]: botSettings.base_config.translations.ennoblements[use_locale]["command_message"]["cron_id"] };
								final_choices = filtered_choices;
							}
						}
						else {
							filtered_choices = { ["server"]: botSettings.base_config.translations.ennoblements[use_locale]["command_message"]["server"] };
							final_choices = filtered_choices;
						}
					}
					break;
				case "continent":
					try {
						option = hoisted_options.filter(option => option.name === "server")[0].value;
						choices = botSettings.base_config.running_servers_continents[option];
						filtered_choices = focused_option.value.split("&").length > 1 ?
							["all"].concat(choices.filter(continent => continent.startsWith(focused_option.value.split("&").pop())).map(item => `${focused_option.value.split("&").slice(0, -1).join("&")}&${item}`).splice(0, 19))
							: ["all"].concat(choices.filter(choice => choice.startsWith(focused_option.value)).splice(0, 19));
						final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
					}
					catch (error) {
						if (sub_command === "modify") {
							try {
								option = botSettings.guilds_config.flatMap(guild => guild.config.cronjobs.find(cron => cron.cron_id === hoisted_options.find(option => option.name === "id").value) || [])[0].message[0];
								choices = botSettings.base_config.running_servers_continents[option];;
								filtered_choices = focused_option.value.split("&").length > 1 ?
									["all"].concat(choices.filter(continent => continent.startsWith(focused_option.value.split("&").pop())).map(item => `${focused_option.value.split("&").slice(0, -1).join("&")}&${item}`).splice(0, 19))
									: ["all"].concat(choices.filter(choice => choice.startsWith(focused_option.value)).splice(0, 19));
								final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
							}
							catch (err) {
								filtered_choices = { ["cron_id"]: botSettings.base_config.translations.ennoblements[use_locale]["command_message"]["cron_id"] };
								final_choices = filtered_choices;
							}
						}
						else {
							filtered_choices = { ["server"]: botSettings.base_config.translations.ennoblements[use_locale]["command_message"]["server"] };
							final_choices = filtered_choices;
						}
					}
					break;
				case "id":
					choices = botSettings.guilds_config.flatMap(guild => guild.config.cronjobs.filter(cronjob => cronjob.type === "ennoblement" && guild.guild_id === interaction.guildId));
					filtered_choices = choices.map(cronjob => ({ name: cronjob.cron_id, value: `${cronjob.message[0]}  ${typeof cronjob.message[1] === "string" ? cronjob.message[1] : Object.values(cronjob.message[1]).join(",")} | ${botSettings.base_config.translations.ennoblements[use_locale]["channel"]}: ${cronjob.channel_id} | ${botSettings.base_config.translations.ennoblements[use_locale]["play"]}: ${cronjob.play}` }))
					final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr.name]: curr.value }), {});
					break;
			}
		}
		else if (interaction.commandName === "guild_settings") {
			use_locale = helper.translation_locale("guild_settings", interaction.locale);
			switch (focused_option.name) {
				case "market":
					choices = botSettings.base_config.markets.map((market) => market.market);
					filtered_choices = choices.filter(choice => choice.startsWith(focused_option.value)).splice(0, 20);
					final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
					break;
				case "language":
					choices = Object.keys(botSettings.base_config.translations.guild_settings);
					filtered_choices = choices.filter(choice => choice.startsWith(focused_option.value)).splice(0, 20);
					final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
					break;
				case "global_world":
					choices = (await botSettings.base_config.running_servers).filter(server => enabled_markets.includes(server.substring(0, 2)));
					filtered_choices = choices.filter(choice => choice.startsWith(focused_option.value)).splice(0, 20);
					final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
					break;
				case "global_guild":
					option = hoisted_options.filter(option => option.name === "global_world")[0];
					switch (option) {
						case undefined:
							if (!interaction_guild || !interaction_guild.global_world) {
								filtered_choices = { ["server_error"]: botSettings.base_config.translations.guild_settings[use_locale]["server_error"] };
								final_choices = filtered_choices;
							}
							else {
								choices = botSettings.cache.map_ally[interaction_guild.global_world].sort(sort_ally_by_rank).map(ally => decodeURIComponent(`${ally.split(",")[botSettings.base_config.map_data.ally.data.indexOf("tag")]}`.replaceAll("+", " ")));
								filtered_choices = choices.filter(choice => choice.startsWith(focused_option.value)).splice(0, 20);
								final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
							}
							break;
						default:
							choices = botSettings.cache.map_ally[option.value].sort(sort_ally_by_rank).map(ally => decodeURIComponent(`${ally.split(",")[botSettings.base_config.map_data.ally.data.indexOf("tag")]}`.replaceAll("+", " ")));
							filtered_choices = focused_option.value.split("&").length > 1 ?
								choices.filter(ally => ally.startsWith(focused_option.value.split("&").pop())).map(item => `${focused_option.value.split("&").slice(0, -1).join("&")}&${item}`).splice(0, 20)
								: choices.filter(choice => choice.startsWith(focused_option.value)).splice(0, 20);
							final_choices = filtered_choices.reduce((acc, curr) => ({ ...acc, [curr]: curr }), {});
							break;
					}
			}
		}
		interaction.respond(
			Object.entries(final_choices).map(([key, value]) => ({ name: value, value: key })),
		);
		function sort_ally_by_rank(a, b) {
			var ally_rank_a = +a.split(',')[botSettings.base_config.map_data.ally.data.indexOf("rank")];
			var ally_rank_b = +b.split(',')[botSettings.base_config.map_data.ally.data.indexOf("rank")];
			return ally_rank_a - ally_rank_b;
		}
		function sort_player_by_rank(a, b) {
			var player_rank_a = +a.split(',')[botSettings.base_config.map_data.player.data.indexOf("rank")];
			var player_rank_b = +b.split(',')[botSettings.base_config.map_data.player.data.indexOf("rank")];
			return player_rank_a - player_rank_b;
		}
	}
});
discordClient.on(Events.GuildCreate, async (guild) => {
	await mongodb.CREATE_GUILD({
		guild_id: guild.id,
		market: guild.preferredLocale,
		guild_name: guild.name,
		active: true
	});
	update_config();
});
discordClient.on(Events.GuildDelete, async (guild) => {
	const guild_data = botSettings.guilds_config.find(guild_config => guild_config.guild_id === guild.id);
	const active_cronjobs = Object.keys(botSettings.cronjobs.guild_cronjobs);
	guild_data.config.cronjobs.forEach(cronjob => {
		if (active_cronjobs.includes(cronjob.cron_id)) {
			if (botSettings.cronjobs.guild_cronjobs[cronjob.cron_id].running) {
				botSettings.cronjobs.guild_cronjobs[cronjob.cron_id].stop();
			}
			delete botSettings.cronjobs.guild_cronjobs[cronjob.cron_id];
		}
	});
	await mongodb.ACTIVE({
		guild_id: guild.id,
		guild_name: guild.name,
		active: false
	});
	guild_data.config = botSettings.base_config.sample_guild.config;
	await mongodb.UPDATE_GUILD_CONFIG("config", guild_data);
	update_config();
});
discordClient.on(Events.ChannelDelete, async (channel) => {
	const guild_data = botSettings.guilds_config.find(guild_config => guild_config.guild_id === channel.guildId);
	const ennoblements_cronjobs = [...new Set(botSettings.guilds_config.flatMap(guild => guild.config.cronjobs.filter(cronjob => cronjob.type === "ennoblement" && cronjob.play === true && cronjob.channel_id === channel.id)))];

	ennoblements_cronjobs.forEach(cronjob => delete_cronjob(cronjob));

	function delete_cronjob(cronjob) {
		data = {
			scope: "guild",
			guild_id: channel.guildId,
			guild_name: guild_data.name,
			market: guild_data.market,
			cron_id: cronjob.cron_id
		};
		cron_jobs("delete", data);
	}
})

async function help_handler(interaction) {
	const use_locale = helper.translation_locale("help", interaction.locale);
	const translation = botSettings.base_config.translations.help[use_locale];
	const options = {
		command: interaction.options.getSubcommand(),
		text: interaction.options.getString("text") ?? ""
	};
	const embed = new EmbedBuilder();
	switch (options.command) {
		case "bug":
			if (options.text !== "") {
				embed.setAuthor({
					"name": `${interaction.user.username}#${interaction.user.discriminator}`
				});
				embed.setDescription(options.text);
				embed.addFields([
					{
						"name": `Guild name: ${interaction.guild.name}`,
						"value": `Guild id: ${interaction.guild.id}`
					}
				]);
				embed.setTimestamp();
				discordClient.channels.cache.get(botSettings.base_config.dev_channels.bugs).send({ embeds: [embed] });
				interaction.editReply({ content: `${translation["bug"]} ${translation["success"]}`, ephemeral: true });
			}
			else {
				interaction.editReply({ content: `${translation["error"]}`, ephemeral: true });
			}
			break;
		case "idea":
			if (options.text !== "") {
				embed.setAuthor({
					"name": `${interaction.user.username}#${interaction.user.discriminator}`
				});
				embed.setDescription(options.text);
				embed.addFields([
					{
						"name": `Guild name: ${interaction.guild.name}`,
						"value": `Guild id: ${interaction.guild.id}`
					}
				]);
				embed.setTimestamp();
				discordClient.channels.cache.get(botSettings.base_config.dev_channels.idea).send({ embeds: [embed] });
				interaction.editReply({ content: `${translation["idea"]} ${translation["success"]}`, ephemeral: true });
			}
			else {
				interaction.editReply({ content: `${translation["error"]}`, ephemeral: true });
			}
			break;
	}
}
async function send_message(cron) {
	discordClient.channels.cache.get(cron.channel_id).send(cron.message);
}
async function update_live_servers() {
	const servers = [];
	for await (const market of botSettings.base_config.markets) {
		const market_response = await axios.get(`https://www${market.link}/page/stats`);
		const dom_market = new JSDOM(market_response.data);
		const szerver_raw = dom_market.window.document.getElementsByTagName("aside")[0].children[1].children[1].children;
		for (const server_elem of szerver_raw) {
			const szerver_name = server_elem.children[0].hostname.split(".")[0];
			servers.push(szerver_name)
		}
	}
	botSettings.base_config.running_servers = servers;
	await mongodb.UPDATE_BASE_CONFIG("running_servers", servers);

	const running_servers_continents = {};
	function get_continent_number(village) {
		const x = village.split(",")[botSettings.base_config.map_data.village.data.indexOf("x")];
		const y = village.split(",")[botSettings.base_config.map_data.village.data.indexOf("y")];
		return `k${y.length > 2 ? y.charAt(0) : 0}${x.length > 2 ? x.charAt(0) : 0}`;
	}
	for (const server of Object.keys(botSettings.cache.map_village)) {
		running_servers_continents[server] = [...new Set(botSettings.cache.map_village[server].map(village => get_continent_number(village)))].sort();
	}
	await mongodb.UPDATE_BASE_CONFIG("running_servers_continents", running_servers_continents);
}
async function get_generated_map(interaction, cron) {
	const options = {
		server: interaction.options?.getString("server") ?? cron.message.server,
		type: interaction.options?.getString("type") ?? cron.message.type
	};
	if (!botSettings.base_config.map_pic_types.includes(options.type)) { return; }
	if (!botSettings.base_config.running_servers.includes(options.server)) { return; }
	const response = await axios.get(`https://ptbmaps.twspeeds.com/${options.server}/${options.type}.png`, { responseType: 'arraybuffer' });
	if (response.status === 404) {
		switch (interaction) {
			case false:
				return;
			default:
				interaction.editReply({ content: 'No map for this server or typed incorrectly!', ephemeral: true });
				return;
		}
	}
	const buffer = Buffer.from(response.data, 'binary');
	const attachment = new AttachmentBuilder(buffer, { name: "map.png" });
	switch (interaction) {
		case false:
			discordClient.channels.cache.get(cron.channel_id).send({ files: [attachment] });
			break;
		default:
			interaction.editReply({ files: [attachment] });
			break;
	}
}
async function download_map_data() {
	const enabled_markets = botSettings.base_config.markets.filter(market => market.enabled === true).map(market => market.market);
	const promises = enabled_markets.map(market => get_market_data(market));
	await Promise.all(promises);
	console.log("All map data downloaded");
	return true;
	function get_market_data(market) {
		return new Promise(async (resolve, reject) => {
			const server_link = botSettings.base_config.markets.filter(tw_market => tw_market.market === market)[0].link;
			const servers_of_market = botSettings.base_config.running_servers.filter(server => server.startsWith(market));
			var priority_server = `${market}${Math.max(...servers_of_market.map(server => isNaN(+server.slice(2)) ? 0 : +server.slice(2)))}`;
			var sorted_servers = prioritize_server(servers_of_market, priority_server);
			for (const server of sorted_servers) {
				for (const type in botSettings.base_config.map_data) {
					await save_map_data(server, server_link, type);
				}
			}
			resolve();
		});
	}
	async function save_map_data(server, server_link, type) {
		const promise = new Promise(async (resolve, reject) => {
			const data_compression = botSettings.base_config.map_data[type].type === "gz" ? ".txt.gz" : ".txt";
			const url = `https://${server}${server_link}/map/${type}${data_compression}`;
			try {
				const response = await axios.get(url, { responseType: 'arraybuffer' });
				if (response.status !== 200) {
					console.log(`Failed to download file: ${server}/${type} status: ${response.status}`);
					resolve();
					return;
				}
				else if (response.headers["content-type"] === "text/html; charset=utf-8") {
					console.log(`Failed to download file: ${server}/${type} error: Server is not running`);
					resolve();
					return;
				}
				resolve();
				let unzipped_data;
				switch (data_compression) {
					case ".txt.gz":
						unzipped_data = zlib.gunzipSync(response.data);
						break;
					case ".txt":
						unzipped_data = response.data;
						break;
				}
				const location = `${botSettings.locations[`map_${type}`]}${server}.txt`;
				fs.writeFileSync(location, unzipped_data);
			}
			catch (error) {
				console.log(`Failed to download file: ${server}/${type} error: ${error}`);
				if (`${error}`.search("ENOTFOUND")) {
					return save_map_data(server, server_link, type);
				}
				resolve();
			}
		});
		await promise;
	}
	function prioritize_server(servers, priority_server) {
		servers.sort(function (a, b) {
			if (a === priority_server) {
				return -1; // make priority server first
			} else if (b === priority_server) {
				return 1; // make priority server first
			} else {
				return 0; // keep original order
			}
		});
		return servers;
	}
}
async function download_daily_stats() {
	const time = new Date();
	const time_zone_offset = -time.getTimezoneOffset() * 60 * 1000;
	const utc_time = new Date(time.getTime() - time_zone_offset);
	const utc_time_hour = utc_time.getHours();
	const enabled_markets = botSettings.base_config.markets.filter((market) => {
		const time_to_do = (utc_time_hour + market.timezone) % 24 === 0;
		return market.enabled && time_to_do ? true : false
	}).map(market => market.market);
	const stats = {};
	const players_on_a_page = 25;
	await get_market_data_for_all(enabled_markets);
	console.log("All daily stat data downloaded");
	async function get_market_data_for_all(markets) {
		if (enabled_markets.length === 1) {
			await get_market_data(enabled_markets[0]);
		}
		else {
			for (const market of markets) {
				await get_market_data(market);
			}
		}
		return true;
	}
	async function get_market_data(market) {
		return new Promise(async (resolve, reject) => {
			const server_regex = new RegExp(`${market}\\w?\\d{1,}`);
			const servers_of_market = botSettings.base_config.running_servers.filter(server => server.startsWith(market) && !["s", "p", "c"].some((prefix) => server.slice(2).startsWith(prefix)));
			const servers_sorted = prioritize_server(servers_of_market);
			const priority_servers_to_download = servers_sorted.slice(0, 2);
			const daily_stat_cronjobs = botSettings.guilds_config.flatMap(guild => guild.config.cronjobs.filter(cronjob => cronjob.type === "stat" && cronjob.message?.command === "daily" && cronjob.play === true && botSettings.base_config.running_servers.includes(cronjob.message?.server)));
			const daily_stat_cronjobs_servers = daily_stat_cronjobs.map(cronjob => cronjob.message.server).filter(server => server_regex.test(server));
			const servers_to_download = [...new Set(priority_servers_to_download.concat(daily_stat_cronjobs_servers))];
			for (const server of servers_to_download) {
				await get_server_data(server, market);
			}
			resolve();
		});
	}
	async function get_server_data(server, market) {
		return new Promise(async (resolve, reject) => {
			botSettings.cache.daily_stats[server] === undefined ? botSettings.cache.daily_stats[server] = {} : null;
			stats[server] = {};
			try {
				const players_on_server = Object.keys(botSettings.cache.map_player[server]).length;
				const server_link = botSettings.base_config.markets.filter(link => link.market === market)[0].link;
				const promises = botSettings.base_config.daily_stat_types.map(type => get_type_data(type, server, server_link, players_on_server));
				await Promise.all(promises);
				botSettings.cache.daily_stats[server] = stats[server];
				const server_stat_json = JSON.stringify(stats[server]);
				fs.writeFileSync(`${botSettings.locations.daily_stats}${server}.json`, server_stat_json);
				resolve();
			} catch (e) { resolve(); }
		});
	}
	async function get_type_data(type, server, server_link, players_on_server) {
		return new Promise(async (resolve, reject) => {
			try {
				for (let offset = 0; offset < players_on_server + players_on_a_page; offset += players_on_a_page) {
					const data = await axios.get(`https://${server}${server_link}/guest.php?screen=ranking&mode=in_a_day&offset=${offset}&type=${type}`);
					if (data.status !== 200) { console.log(data.status); }
					const dom = new JSDOM(data.data);
					const table = dom.window.document.getElementById("in_a_day_ranking_table");
					for (let row = 1; row < table.rows.length; row++) {
						const player_id = table.rows[row].cells[1].children[0].href.split("id=")[1];
						stats[server][player_id] === undefined ? stats[server][player_id] = {} : null;
						stats[server][player_id]["guild"] = table.rows[row].cells[2]?.children[1]?.textContent;
						stats[server][player_id][type] = +table.rows[row].cells[3].textContent.replaceAll(".", "");
					}
					await helper.sleep(100);
				}
				resolve();
			}
			catch (error) {
				if (DEV) {
					console.log(`error: ${server} ${type} ${error}`);
				}
				resolve();
			}
		});
	}
	function prioritize_server(servers) {
		servers.sort(function (a, b) {
			const server_num_a = +a.slice(2);
			const server_num_b = +b.slice(2);
			return server_num_b - server_num_a;
		});
		return servers;
	}
}
async function set_ennoblements(interaction) {
	const guild = botSettings.guilds_config.find(guild => guild.guild_id === interaction.guild.id);
	const use_locale = helper.translation_locale("ennoblements", interaction.locale);
	const translation = botSettings.base_config.translations.ennoblements[use_locale]["command_message"];
	const ennoblements_options = botSettings.base_config.ennoblements.options;
	const ennoblements_options_indexes = Object.keys(ennoblements_options);
	const options = {
		guild: interaction.guild.id,
		guild_name: interaction.guild.name,
		market: use_locale,
		command: interaction.options.getSubcommand(),
		channel: interaction.options.getChannel("channel")?.id ?? interaction.channelId
	};
	let additional_options, data, tribes, fields, embed;
	const ennoblements_cronjobs = guild?.config.cronjobs.filter(cronjob => cronjob.type === "ennoblement") ?? [];
	switch (options.command) {
		case "add":
			additional_options = {
				server: interaction.options.getString("server") ?? undefined,
				tribe: interaction.options.getString("tribe") ?? "all",
				gain: interaction.options.getBoolean("gain") ?? false,
				loss: interaction.options.getBoolean("loss") ?? false,
				self: interaction.options.getBoolean("self") ?? false,
				internal: interaction.options.getBoolean("internal") ?? false,
				barbarian: interaction.options.getBoolean("barbarian") ?? false,
				continent: interaction.options.getString("continent") ?? "all",
				play: interaction.options.getBoolean("play") ?? true
			};
			if (!botSettings.base_config.running_servers.includes(additional_options.server)) {
				interaction.editReply({ content: `${translation["server"]}`, ephemeral: true });
				return;
			}
			if (additional_options.tribe !== "all") {
				tribes = botSettings.cache.map_ally[additional_options.server].map(ally => ally.split(","));
				tribes.filter(tribe => additional_options.tribe.split("&").includes(decodeURIComponent(tribe[botSettings.base_config.map_data.ally.data.indexOf("tag")].replaceAll("+", " ")))).forEach(tribe => {
					typeof additional_options.tribe !== "object" ? additional_options.tribe = {} : null;
					additional_options.tribe[`${tribe[botSettings.base_config.map_data.ally.data.indexOf("id")]}`] = decodeURIComponent(tribe[botSettings.base_config.map_data.ally.data.indexOf("tag")].replaceAll("+", " "));
				});
				if (typeof additional_options.tribe !== "object") {
					interaction.editReply({ content: `${translation["tribe_error"]}`, ephemeral: true });
					return;
				}
			}
			data = {
				scope: "guild",
				guild_id: options.guild,
				guild_name: options.guild_name,
				market: options.market,
				time: "* * * * *",
				type: "ennoblement",
				message: [
					additional_options.server,
					additional_options.tribe,
					additional_options.gain,
					additional_options.loss,
					additional_options.self,
					additional_options.internal,
					additional_options.barbarian,
					additional_options.continent
				],
				channel_id: options.channel,
				onetime: false,
				play: additional_options.play
			};
			await cron_jobs("create", data);
			interaction.editReply({ content: `${translation["created"]}: ${typeof additional_options.tribe === "string" ? additional_options.tribe : Object.values(additional_options.tribe).join(",")}`, ephemeral: true });
			break;
		case "delete":
			additional_options = {
				id: interaction.options.getString("id") ?? "",
				all: interaction.options.getBoolean("all") ?? false
			};
			if (additional_options.all) {
				for (cron of ennoblements_cronjobs) {
					const data = {
						scope: "guild",
						guild_id: options.guild,
						guild_name: options.guild_name,
						market: options.market,
						cron_id: cron.cron_id
					};
					await cron_jobs("delete", data);
					interaction.editReply({ content: `${translation["all_deleted"]}`, ephemeral: true });
				}
			}
			else {
				if (ennoblements_cronjobs.map(cronjob => cronjob.cron_id).includes(additional_options.id)) {
					data = {
						scope: "guild",
						guild_id: options.guild,
						guild_name: options.guild_name,
						market: options.market,
						cron_id: additional_options.id
					};
					await cron_jobs("delete", data);
					interaction.editReply({ content: `${translation["deleted"]}`, ephemeral: true });
				}
				else {
					interaction.editReply({ content: `${translation["cron_id"]}`, ephemeral: true });
					return;
				}
			}
			break;
		case "modify":
			additional_options = {
				id: interaction.options.getString("id") ?? undefined,
				server: interaction.options.getString("server") ?? undefined,
				tribe: interaction.options.getString("tribe") ?? undefined,
				gain: interaction.options.getBoolean("gain") ?? undefined,
				loss: interaction.options.getBoolean("loss") ?? undefined,
				self: interaction.options.getBoolean("self") ?? undefined,
				internal: interaction.options.getBoolean("internal") ?? undefined,
				barbarian: interaction.options.getBoolean("barbarian") ?? undefined,
				continent: interaction.options.getString("continent") ?? undefined,
				channel: interaction.options.getChannel("channel")?.id ?? undefined,
				play: interaction.options.getBoolean("play") ?? undefined
			};
			if (!ennoblements_cronjobs.map(cronjob => cronjob.cron_id).includes(additional_options.id)) {
				interaction.editReply({ content: `${translation["cron_id"]}`, ephemeral: true });
				return;
			}
			if (additional_options.server && !botSettings.base_config.running_servers.includes(additional_options.server)) {
				interaction.editReply({ content: `${translation["server"]}`, ephemeral: true });
				return;
			}
			const cronjob_to_modify = ennoblements_cronjobs.find(cronjob => cronjob.cron_id === additional_options.id);
			if (additional_options.channel) { cronjob_to_modify.channel_id = additional_options.channel; }
			if (typeof (additional_options.play) !== "undefined") { cronjob_to_modify.play = additional_options.play; }
			if (additional_options.server) { cronjob_to_modify.message[ennoblements_options_indexes.indexOf("server")] = additional_options.server; }
			if (typeof (additional_options.tribe) !== "undefined") {
				if (additional_options.tribe !== "all") {
					tribes = botSettings.cache.map_ally[cronjob_to_modify.message[ennoblements_options_indexes.indexOf("server")]].map(ally => ally.split(","));
					tribes.filter(tribe => additional_options.tribe.split("&").includes(decodeURIComponent(tribe[botSettings.base_config.map_data.ally.data.indexOf("tag")].replaceAll("+", " ")))).forEach(tribe => {
						typeof additional_options.tribe !== "object" ? additional_options.tribe = {} : null;
						additional_options.tribe[`${tribe[botSettings.base_config.map_data.ally.data.indexOf("id")]}`] = decodeURIComponent(tribe[botSettings.base_config.map_data.ally.data.indexOf("tag")].replaceAll("+", " "));
					});
					if (typeof additional_options.tribe !== "object") {
						interaction.editReply({ content: `${translation["tribe_error"]}`, ephemeral: true });
						return;
					}
				}
				cronjob_to_modify.message[ennoblements_options_indexes.indexOf("tribe")] = additional_options.tribe;
			}
			if (typeof (additional_options.gain) !== "undefined") { cronjob_to_modify.message[ennoblements_options_indexes.indexOf("gain")] = additional_options.gain; }
			if (typeof (additional_options.loss) !== "undefined") { cronjob_to_modify.message[ennoblements_options_indexes.indexOf("loss")] = additional_options.loss; }
			if (typeof (additional_options.self) !== "undefined") { cronjob_to_modify.message[ennoblements_options_indexes.indexOf("self")] = additional_options.self; }
			if (typeof (additional_options.internal) !== "undefined") { cronjob_to_modify.message[ennoblements_options_indexes.indexOf("internal")] = additional_options.internal; }
			if (typeof (additional_options.barbarian) !== "undefined") { cronjob_to_modify.message[ennoblements_options_indexes.indexOf("barbarian")] = additional_options.barbarian; }
			if (typeof (additional_options.continent) !== "undefined") { cronjob_to_modify.message[ennoblements_options_indexes.indexOf("continent")] = additional_options.continent; }
			data = {
				cron_id: additional_options.id,
				scope: "guild",
				guild_id: options.guild,
				guild_name: options.guild_name,
				market: options.market,
				time: "* * * * *",
				type: "ennoblement",
				message: cronjob_to_modify.message,
				channel_id: cronjob_to_modify.channel_id,
				onetime: false,
				play: cronjob_to_modify.play
			};
			await cron_jobs("modify", data);
			interaction.editReply({ content: `${translation["modified"]}`, ephemeral: true });
			break;
		case "list":
			additional_options = {
				channel: interaction.options.getChannel("channel")?.id ?? undefined
			};
			fields = [];
			if (additional_options.channel) {
				const channel_ennoblements_cronjobs = ennoblements_cronjobs.filter(cronjob => cronjob.channel_id === additional_options.channel);
				if (channel_ennoblements_cronjobs.length) {
					channel_ennoblements_cronjobs.forEach(cronjob => fields.push({
						name: `ID: ${cronjob.cron_id}`,
						value: `**${translation.list_embed.server}**: ${cronjob.message[ennoblements_options_indexes.indexOf("server")]}** **|** ** **${translation.list_embed.tribe}**: ${typeof cronjob.message[ennoblements_options_indexes.indexOf("tribe")] === "string" ? cronjob.message[ennoblements_options_indexes.indexOf("tribe")] : Object.values(cronjob.message[ennoblements_options_indexes.indexOf("tribe")]).join(",")}** **|** ** **${translation.list_embed.continent}**: ${cronjob.message[ennoblements_options_indexes.indexOf("continent")].split("&").join(",")} \n${translation.list_embed.gain}: ${cronjob.message[ennoblements_options_indexes.indexOf("gain")] ? ":white_check_mark:" : ":x:"}** **|** **${translation.list_embed.loss}: ${cronjob.message[ennoblements_options_indexes.indexOf("loss")] ? ":white_check_mark:" : ":x:"}** **|** **${translation.list_embed.self}: ${cronjob.message[ennoblements_options_indexes.indexOf("self")] ? ":white_check_mark:" : ":x:"}** **|** **${translation.list_embed.internal}: ${cronjob.message[ennoblements_options_indexes.indexOf("internal")] ? ":white_check_mark:" : ":x:"}** **|** **${translation.list_embed.barbarian}: ${cronjob.message[ennoblements_options_indexes.indexOf("barbarian")] ? ":white_check_mark:" : ":x:"}\n${translation.list_embed.channel}: ${cronjob.channel_id} ** **|** ** ${translation.list_embed.play}: ${cronjob.play ? ":white_check_mark:" : ":x:"}`
					}));
				}
				else {
					interaction.editReply({ content: `${translation["channel"]}`, ephemeral: true });
					return;
				}
			}
			else {
				if (ennoblements_cronjobs.length) {
					ennoblements_cronjobs.forEach(cronjob => fields.push({
						name: `ID: ${cronjob.cron_id}`,
						value: `**${translation.list_embed.server}**: ${cronjob.message[ennoblements_options_indexes.indexOf("server")]}** **|** ** **${translation.list_embed.tribe}**: ${typeof cronjob.message[ennoblements_options_indexes.indexOf("tribe")] === "string" ? cronjob.message[ennoblements_options_indexes.indexOf("tribe")] : Object.values(cronjob.message[ennoblements_options_indexes.indexOf("tribe")]).join(",")}** **|** ** **${translation.list_embed.continent}**: ${cronjob.message[ennoblements_options_indexes.indexOf("continent")].split("&").join(",")} \n${translation.list_embed.gain}: ${cronjob.message[ennoblements_options_indexes.indexOf("gain")] ? ":white_check_mark:" : ":x:"}** **|** **${translation.list_embed.loss}: ${cronjob.message[ennoblements_options_indexes.indexOf("loss")] ? ":white_check_mark:" : ":x:"}** **|** **${translation.list_embed.self}: ${cronjob.message[ennoblements_options_indexes.indexOf("self")] ? ":white_check_mark:" : ":x:"}** **|** **${translation.list_embed.internal}: ${cronjob.message[ennoblements_options_indexes.indexOf("internal")] ? ":white_check_mark:" : ":x:"}** **|** **${translation.list_embed.barbarian}: ${cronjob.message[ennoblements_options_indexes.indexOf("barbarian")] ? ":white_check_mark:" : ":x:"}\n${translation.list_embed.channel}: ${cronjob.channel_id} ** **|** ** ${translation.list_embed.play}: ${cronjob.play ? ":white_check_mark:" : ":x:"}`
					}));
				}
				else {
					interaction.editReply({ content: `${translation["guild"]}`, ephemeral: true });
					return;
				}
			}
			embed = new EmbedBuilder();
			embed.setTitle(translation.list_embed.title);
			embed.addFields(fields.splice(0, 20));
			interaction.editReply({ embeds: [embed], ephemeral: true });
			break;
		case "settings":
			additional_options = {
				use_default: interaction.options.getBoolean("use_default") ?? undefined,
				guest_mode: interaction.options.getBoolean("guest_mode") ?? undefined,
				village_points: interaction.options.getBoolean("village_points") ?? undefined,
				player_points: interaction.options.getBoolean("player_points") ?? undefined,
				tribe_points: interaction.options.getBoolean("tribe_points") ?? undefined,
				old_owner: interaction.options.getBoolean("old_owner") ?? undefined,
				date_time: interaction.options.getBoolean("date_time") ?? undefined,
				relative_time: interaction.options.getBoolean("relative_time") ?? undefined,
			};
			no_option_given = [...new Set(Object.values(additional_options))].every(option => option === undefined);
			if (no_option_given) {
				fields = [
					{
						name: `\u200B`,
						value: [
							`**${translation.settings_embed.use_default}**: ${guild.config.live_ennoblements.use_default ? ":white_check_mark:" : ":x:"}`,
							`**${translation.settings_embed.guest_mode}**: ${guild.config.live_ennoblements.guest_mode ? ":white_check_mark:" : ":x:"}`,
							`**${translation.settings_embed.village_points}**: ${guild.config.live_ennoblements.village_points ? ":white_check_mark:" : ":x:"}`,
							`**${translation.settings_embed.player_points}**: ${guild.config.live_ennoblements.player_points ? ":white_check_mark:" : ":x:"}`,
							`**${translation.settings_embed.tribe_points}**: ${guild.config.live_ennoblements.tribe_points ? ":white_check_mark:" : ":x:"}`,
							`**${translation.settings_embed.old_owner}**: ${guild.config.live_ennoblements.old_owner ? ":white_check_mark:" : ":x:"}`,
							`**${translation.settings_embed.date_time}**: ${guild.config.live_ennoblements.date_time ? ":white_check_mark:" : ":x:"}`,
							`**${translation.settings_embed.relative_time}**: ${guild.config.live_ennoblements.relative_time ? ":white_check_mark:" : ":x:"}`
						].join("\n")
					}
				];
				embed = new EmbedBuilder();
				embed.setTitle(translation.settings_embed.title);
				embed.addFields(fields);
				interaction.editReply({ embeds: [embed], ephemeral: true });
				return;
			}
			Object.entries(additional_options).forEach(([key, value]) => {
				value === undefined ? null : guild.config.live_ennoblements[key] = value;
			});
			data = {
				guild_id: options.guild,
				guild_name: options.guild_name,
				active: guild?.active ?? true,
				live_ennoblements: guild.config.live_ennoblements
			}
			await mongodb.UPDATE_GUILD_CONFIG("live_ennoblements", data);
			interaction.editReply({ content: `${translation["modified"]}`, ephemeral: true });
			break;
	}
}
async function live_ennoblements() {
	const botSettings_copy = {
		base_config: JSON.parse(JSON.stringify(botSettings.base_config)),
		guilds_config: JSON.parse(JSON.stringify(botSettings.guilds_config))
	};
	const indexes = {
		ennoblements_options: Object.keys(botSettings_copy.base_config.ennoblements.options),
		map_ally: botSettings_copy.base_config.map_data.ally.data,
		map_player: botSettings_copy.base_config.map_data.player.data,
		map_village: botSettings_copy.base_config.map_data.village.data,
		ennoblements: botSettings_copy.base_config.map_data.conquer.data
	};
	const colors = botSettings_copy.base_config.ennoblements.colors;
	const translations = botSettings_copy.base_config.translations.ennoblements;
	const date = new Date();
	date.setSeconds(0);
	date.setMilliseconds(0);
	const date_timestamp = (date.getTime() / 1000) - 60;
	const ennoblements_cronjobs = botSettings_copy.guilds_config.flatMap(guild => guild.config.cronjobs.filter(cronjob => cronjob.type === "ennoblement" && cronjob.play === true));
	const servers = [...new Set(ennoblements_cronjobs.map(cron => cron.message[indexes.ennoblements_options.indexOf("server")]))];
	servers.forEach(server => get_ennoblements(server));
	function get_continent_number(village) {
		const x = village[indexes.map_village.indexOf("x")];
		const y = village[indexes.map_village.indexOf("y")];
		return `k${y.length > 2 ? y.charAt(0) : 0}${x.length > 2 ? x.charAt(0) : 0}`;
	}
	function format_number(num) {
		return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	}
	async function get_ennoblements(server) {
		if (!botSettings_copy.base_config.running_servers.includes(server)) { return; }
		const market = botSettings_copy.base_config.markets.find(market => market.market === server.substring(0, 2));
		if (!market.enabled) { return; }
		const response = await axios.get(`https://${server}${market.link}/interface.php?func=get_conquer&since=${date_timestamp}`);
		if (response.data.startsWith("<!DOCTYPE html>")) { return; }
		const ennoblements = response.data.split("\n");
		if (ennoblements.toString().length < 5) { return; }
		const map_village = botSettings.cache["map_village"][server].concat();
		const map_player = botSettings.cache["map_player"][server].concat();
		const map_ally = botSettings.cache["map_ally"][server].concat();
		for (const ennoblement of ennoblements) {
			const noble = {
				village: {},
				date: {},
				old_owner: {
					ally: {},
				},
				new_owner: {
					ally: {},
				},
				_set_village: function () {
					this.village.id = ennoblement.split(",")[indexes.map_village.indexOf("id")];
					this.village.data = map_village.find(village => village.split(",")[indexes.map_village.indexOf("id")] === this.village.id).split(",");
					this.village.name = decodeURIComponent(this.village.data[indexes.map_village.indexOf("name")].replaceAll("+", " "));
					this.village.coord = `${this.village.data[indexes.map_village.indexOf("x")]}|${this.village.data[indexes.map_village.indexOf("y")]}`;
					this.village.continent = get_continent_number(this.village.data);
					this.village.points = this.village.data[indexes.map_village.indexOf("points")];
					this.village.link = `https://${server}${market.link}/game.php?village=0&screen=info_village&id=${this.village.id}`;
					this.village.link_guest = `https://${server}${market.link}/guest.php?screen=info_village&id=${this.village.id}`;
				},
				_set_date: function () {
					this.date.unix_timestamp = +ennoblement.split(",")[indexes.ennoblements.indexOf("unix_timestamp")];
					this.date.unix_date = new Date(this.date.unix_timestamp * 1000);
					this.date.time_zone_offset = -this.date.unix_date.getTimezoneOffset() * 60 * 1000;
					this.date.utc = new Date(this.date.unix_date.getTime() - this.date.time_zone_offset);
					this.date.market = new Date(this.date.utc.getTime() + market.timezone * 60 * 60 * 1000);
				},
				_set_old_owner: function () {
					this.old_owner.id = ennoblement.split(",")[indexes.ennoblements.indexOf("old_owner")];
					this.old_owner.data = map_player.find(player => player.split(",")[indexes.map_player.indexOf("id")] === this.old_owner.id)?.split(",");
					this.old_owner.player = typeof this.old_owner.data !== "undefined" ? true : false;
					if (this.old_owner.player) {
						this.old_owner.name = decodeURIComponent(this.old_owner.data[indexes.map_player.indexOf("name")].replaceAll("+", " "));
						this.old_owner.points = this.old_owner.data[indexes.map_player.indexOf("points")];
						this.old_owner.link = `https://${server}${market.link}/game.php?village=0&screen=info_player&id=${this.old_owner.id}`;
						this.old_owner.link_guest = `https://${server}${market.link}/guest.php?screen=info_player&id=${this.old_owner.id}`;
						this.old_owner.ally.id = this.old_owner.data[indexes.map_player.indexOf("ally")];
						this.old_owner.ally.joined = this.old_owner.ally.id !== "0" ? true : false;
						if (this.old_owner.ally.joined) {
							this.old_owner.ally.data = map_ally.find(ally => ally.split(",")[indexes.map_ally.indexOf("id")] === this.old_owner.ally.id)?.split(",");
							this.old_owner.ally.tag = decodeURIComponent(this.old_owner.ally.data[indexes.map_ally.indexOf("tag")].replaceAll("+", " "));
							this.old_owner.ally.points = this.old_owner.ally.data[indexes.map_ally.indexOf("all_points")];
							this.old_owner.ally.link = `https://${server}${market.link}/game.php?village=0&screen=info_ally&id=${this.old_owner.ally.id}`;
							this.old_owner.ally.link_guest = `https://${server}${market.link}/guest.php?screen=info_ally&id=${this.old_owner.ally.id}`;
						}
					}
				},
				_set_new_owner: function () {
					this.new_owner.id = ennoblement.split(",")[indexes.ennoblements.indexOf("new_owner")];
					this.new_owner.data = map_player.find(player => player.split(",")[indexes.map_player.indexOf("id")] === this.new_owner.id)?.split(",");
					this.new_owner.player = typeof this.new_owner.data !== "undefined" ? true : false;
					if (this.new_owner.player) {
						this.new_owner.name = decodeURIComponent(this.new_owner.data[indexes.map_player.indexOf("name")].replaceAll("+", " "));
						this.new_owner.points = this.new_owner.data[indexes.map_player.indexOf("points")];
						this.new_owner.link = `https://${server}${market.link}/game.php?village=0&screen=info_player&id=${this.new_owner.id}`;
						this.new_owner.link_guest = `https://${server}${market.link}/guest.php?screen=info_player&id=${this.new_owner.id}`;
						this.new_owner.ally.id = this.new_owner.data[indexes.map_player.indexOf("ally")];
						this.new_owner.ally.joined = this.new_owner.ally.id !== "0" ? true : false;
						if (this.new_owner.ally.joined) {
							this.new_owner.ally.data = map_ally.find(ally => ally.split(",")[indexes.map_ally.indexOf("id")] === this.new_owner.ally.id)?.split(",");
							this.new_owner.ally.tag = decodeURIComponent(this.new_owner.ally.data[indexes.map_ally.indexOf("tag")].replaceAll("+", " "));
							this.new_owner.ally.points = this.new_owner.ally.data[indexes.map_ally.indexOf("all_points")];
							this.new_owner.ally.link = `https://${server}${market.link}/game.php?village=0&screen=info_ally&id=${this.new_owner.ally.id}`;
							this.new_owner.ally.link_guest = `https://${server}${market.link}/guest.php?screen=info_ally&id=${this.new_owner.ally.id}`;
						}
					}
				},
				_init: function () {
					this._set_village();
					this._set_date();
					this._set_old_owner();
					this._set_new_owner();
					return this;
				}
			}._init();
			const cronjobs_server = ennoblements_cronjobs.filter(cron => cron.message[indexes.ennoblements_options.indexOf("server")] === server);
			for (const cronjob of cronjobs_server) {
				const guild = botSettings_copy.guilds_config.find(guild => guild.config.cronjobs.some(cron => cron === cronjob));
				const use_translation = translations[guild.market] ? translations[guild.market] : translations["en"];
				const enabled_continents = cronjob.message[indexes.ennoblements_options.indexOf("continent")].split("&");
				if (!enabled_continents.includes("all")) {
					if (!enabled_continents.includes(noble.village.continent)) {
						continue;
					}
				}
				const embed = new EmbedBuilder();
				let create_embed = false;
				switch (cronjob.message[indexes.ennoblements_options.indexOf("tribe")]) {
					case "all":
						if (noble.old_owner.player) {
							if (noble.new_owner.id === noble.old_owner.id && cronjob.message[indexes.ennoblements_options.indexOf("self")]) { create_embed = true; embed.setColor(colors.self) }
							else if (noble.new_owner.ally.id === noble.old_owner.ally.id && noble.new_owner.ally.joined && cronjob.message[indexes.ennoblements_options.indexOf("internal")]) { create_embed = true; embed.setColor(colors.internal) }
							else if (cronjob.message[indexes.ennoblements_options.indexOf("gain")]) { create_embed = true; embed.setColor(colors.gain) }
						}
						if (!noble.old_owner.player && cronjob.message[indexes.ennoblements_options.indexOf("barbarian")]) { create_embed = true; embed.setColor(colors.barbarian); }
						break;
					default:
						const new_player_tribe_equals = Object.keys(cronjob.message[indexes.ennoblements_options.indexOf("tribe")]).includes(noble.new_owner.ally.id) ? true : false;
						const old_player_tribe_equals = Object.keys(cronjob.message[indexes.ennoblements_options.indexOf("tribe")]).includes(noble.old_owner.ally.id) ? true : false;
						if (new_player_tribe_equals) {
							if (noble.old_owner.player) {
								if (noble.new_owner.id === noble.old_owner.id) {
									if (cronjob.message[indexes.ennoblements_options.indexOf("self")]) {
										create_embed = true; embed.setColor(colors.self)
									}
								}
								else if (noble.new_owner.ally.id === noble.old_owner.ally.id) {
									if (noble.new_owner.ally.joined && cronjob.message[indexes.ennoblements_options.indexOf("internal")]) {
										create_embed = true; embed.setColor(colors.internal)
									}
								}
								else if (cronjob.message[indexes.ennoblements_options.indexOf("gain")]) {
									create_embed = true; embed.setColor(colors.gain)
								}
							}
							if (!noble.old_owner.player && cronjob.message[indexes.ennoblements_options.indexOf("barbarian")]) { create_embed = true; embed.setColor(colors.barbarian); }
						}
						else if (old_player_tribe_equals) {
							if (cronjob.message[indexes.ennoblements_options.indexOf("loss")]) { create_embed = true; embed.setColor(colors.loss) }
						}
						else { }
						break;
				}
				if (create_embed) {
					const embed_settings = guild.config.live_ennoblements.use_default ? botSettings_copy.base_config.ennoblements.settings : guild.config.live_ennoblements;
					const embed_description = {
						new_owner: {
							player: [
								`[`,
								[
									noble.new_owner.name,
									embed_settings.player_points ? ` (${format_number(noble.new_owner.points)}p.)` : ``
								].join(""),
								`]`,
								embed_settings.guest_mode ? `(${noble.new_owner.link_guest}) ` : `(${noble.new_owner.link}) `
							].join(""),
							ally: [
								noble.new_owner.ally.joined ? [
									`[[`,
									[
										noble.new_owner.ally.tag,
										embed_settings.tribe_points ? ` (${format_number(noble.new_owner.ally.points)}p.)` : ``
									].join(""),
									`]]`,
									embed_settings.guest_mode ? `(${noble.new_owner.ally.link_guest}) ` : `(${noble.new_owner.ally.link}) `,
								].join("")
									: ``],
						},
						old_owner: {
							player: [
								noble.old_owner.player ? [
									`[`,
									[
										noble.old_owner.name,
										embed_settings.player_points ? ` (${format_number(noble.old_owner.points)}p.)` : ``
									].join(""),
									`]`,
									embed_settings.guest_mode ? `(${noble.old_owner.link_guest}) ` : `(${noble.old_owner.link}) `
								].join("")
									: use_translation["barbarian"]],
							ally: [
								noble.old_owner.player && noble.old_owner.ally.joined ? [
									`[[`,
									[
										noble.old_owner.ally.tag,
										embed_settings.tribe_points ? ` (${format_number(noble.old_owner.ally.points)}p.)` : ``
									].join(""),
									`]]`,
									embed_settings.guest_mode ? `(${noble.old_owner.ally.link_guest}) ` : `(${noble.old_owner.ally.link}) `,
								].join("")
									: ``],
						},
						village: [
							`[`,
							[
								`${noble.village.name} `,
								`[${noble.village.coord}] `,
								`${noble.village.continent.toUpperCase()}`,
								embed_settings.village_points ? ` (${format_number(noble.village.points)}p.)` : ``
							].join(""),
							`]`,
							embed_settings.guest_mode ? `(${noble.village.link_guest}) ` : `(${noble.village.link}) `
						].join(""),
						generate: function () {
							return [
								this.new_owner.player,
								this.new_owner.ally,
								use_translation["nobled"],
								this.village,
								embed_settings.old_owner ? [
									`(${use_translation["old_owner"]}:`,
									this.old_owner.player,
									`${this.old_owner.ally})`
								].join(" ") : ``,
								embed_settings.relative_time ? [
									` | `,
									`<t:${noble.date.unix_timestamp}:R>`
								].join("") : ``
							].join(" ");
						}
					};
					const embed_footer = [
						`${server}`,
						embed_settings.date_time ? [
							` | `,
							`${noble.date.market.getFullYear()}.${noble.date.market.getMonth() + 1}.${noble.date.market.getDate()} `,
							`${noble.date.market.getHours()}:${noble.date.market.getMinutes()}:${noble.date.market.getSeconds()}  `,
							`UTC${Math.sign(market.timezone) >= 0 ? "+" : "-"}${market.timezone}`
						].join("") : ``
					].join("");
					embed.setDescription(embed_description.generate());
					embed_settings.date_time ? embed.setFooter({ text: embed_footer }) : null;
					try {
						discordClient.channels.cache.get(cronjob.channel_id).send({ embeds: [embed] });
					} catch (error) { log_error(error, { channel_id: cronjob.channel_id }); }
				}
			}
		}
	}
}
async function speed_table() {
	const speed_table_cronjobs = botSettings.guilds_config.flatMap(guild => guild.config.cronjobs.filter(cronjob => cronjob.type === "speed"));
	const speed_data = await fetch_upcoming_speed();
	speed_table_cronjobs.forEach(cronjob => update_speed_messages(cronjob));
	async function fetch_upcoming_speed() {
		const data = await axios.get("https://api.twspeeds.com/speeds/future/hu");
		const dom = new JSDOM('<div><table class="table table-hover table-striped table-bordered"><thead><tr><th><img src="/images/countdown.png"></th><th>Nyelvi verzió</th><th>Elnevezés</th><th>Kezdet</th><th>Befejezés</th><th>Győzelmi feltétel</th><th>Sebesség</th><th>Egység sebesség</th><th>Alvómód</th><th>Helyettesítés</th><th>Morál</th></tr></thead><tbody id="plannedRounds">' + data.data + '</tbody></table></div>');
		const speed_data = [];
		let speed_data_length;
		if (dom.window.document.getElementById("plannedRounds").rows.length > 24) { speed_data_length = 24; }
		else { speed_data_length = dom.window.document.getElementById("plannedRounds").rows.length }
		for (let i = 0; i < speed_data_length; i++) {
			speed_data.push({ name: "\u200B", value: `.${dom.window.document.getElementById("plannedRounds").rows[i].cells[1].textContent.split(".")[1]} | [#${dom.window.document.getElementById("plannedRounds").rows[i].cells[2].innerHTML.split("#")[1].split(" ")[0]}](${dom.window.document.getElementById("plannedRounds").rows[i].cells[2].innerHTML.split('href="')[1].split('"')[0]}) | ${dom.window.document.getElementById("plannedRounds").rows[i].cells[3].textContent} - ${dom.window.document.getElementById("plannedRounds").rows[i].cells[4].textContent} | ${dom.window.document.getElementById("plannedRounds").rows[i].cells[6].textContent}`, inline: false });
		}
		return speed_data;
	}
	function update_speed_messages(cronjob) {
		const use_locale = helper.translation_locale("speed", cronjob.message.locale);
		const speed_upcoming_Embed = new EmbedBuilder()
			.setColor("#00FFFF")
			.setTitle(botSettings.base_config.translations.speed[use_locale]["title"])
			.setDescription(botSettings.base_config.translations.speed[use_locale]["description"])
			.addFields(speed_data)
			.setTimestamp()
		//discordClient.channels.cache.get(cronjob.channel_id).send({ embeds: [speed_upcoming_Embed] });
		discordClient.channels.cache.get(cronjob.channel_id).messages.fetch(cronjob.message.message_id).then(msg => msg.edit({ embeds: [speed_upcoming_Embed] }));
	}
}
async function generate_tribe_chart(interaction, cron) {
	let use_locale, options, guild;
	switch (interaction) {
		case false:
			guild = botSettings.guilds_config.find(guild => guild.config.cronjobs.find(cronjob => cronjob.cron_id === cron.cron_id));
			use_locale = helper.translation_locale("chart", guild.market);
			options = {
				command: cron.message.command,
				scope: cron.message.scope ?? "conquer",
				server: cron.message.server,
				size: cron.message.size ?? 20,
				month: cron.message.month ?? 1,
				player: cron.message.player ?? "",
				ally: cron.message.ally ?? "",
				enemy: cron.message.enemy ?? "",
				barbarian: cron.message.barbarian ?? "",
				continent: cron.message.continent ?? "",
				from: cron.message.from ?? "",
				to: cron.message.to ?? "",
				type: cron.message.type ?? "bar",
				style: cron.message.style ?? "individual",
				color: cron.message.color ?? "black"
			};
			break;
		default:
			use_locale = helper.translation_locale("chart", interaction.locale);
			options = {
				command: interaction.options.getSubcommand(),
				scope: interaction.options.getString("scope") ?? "conquer",
				server: interaction.options.getString("server"),
				size: interaction.options.getNumber("size") ?? 20,
				month: interaction.options.getNumber("month") ?? 1,
				player: interaction.options.getString("player") ?? "",
				ally: interaction.options.getString("ally") ?? "",
				enemy: interaction.options.getString("enemy") ?? "",
				barbarian: interaction.options.getString("barbarian") ?? "",
				continent: interaction.options.getString("continent") ?? "",
				from: interaction.options.getString("from") ?? "",
				to: interaction.options.getString("to") ?? "",
				type: interaction.options.getString("type") ?? "bar",
				style: interaction.options.getString("style") ?? "individual",
				color: interaction.options.getString("color") ?? "black"
			};
			break;
	}
	if (!botSettings.base_config.chart_tribe_stats.scope.includes(options.scope)) { return; }
	if (!botSettings.base_config.running_servers.includes(options.server)) { return; }
	const date = new Date();
	switch (options.command) {
		case "daily":
			switch (options.ally.length > 0) {
				case true:
					daily_stat_players_in_tribe(options.scope);
					break;
				case false:
					daily_stat_tribe(options.scope);
					break;
			}
			break;
		case "monthly":
			stat_monthly(options.scope);
			break;
		case "od":
			switch (options.ally.length > 0) {
				case true:
					stat_players_in_tribe(options.scope);
					break;
				case false:
					stat_tribe(options.scope);
					break;
			}
			break;
		case "conquer":
			stat_conquer();
			break;
	}
	function daily_stat_tribe(scope) {
		date.setTime(fs.statSync(`${botSettings.locations.daily_stats}${options.server}.json`).ctime.getTime() - 24 * 60 * 60 * 1000);
		const map_ally_sorted = botSettings.cache.map_ally[options.server].sort(sort_ally_by_rank);
		const first_x_ally = map_ally_sorted.slice(0, options.size);
		const ally_tags = get_ally_tagnames(first_x_ally);
		const dataset = get_empty_dataset();
		for (const ally of ally_tags) {
			const ally_data = Object.values(botSettings.cache.daily_stats[options.server]).filter(elem => elem.guild === ally);
			let ally_data_a, ally_data_a_sum, ally_data_b, ally_data_b_sum, ally_data_c, ally_data_c_sum, ally_data_sum;
			switch (scope) {
				case "loot_res + scavenge":
					ally_data_a = ally_data.map(elem => elem.loot_res);
					ally_data_b = ally_data.map(elem => elem.scavenge);
					ally_data_a_sum = sum_array_elements(ally_data_a);
					ally_data_b_sum = sum_array_elements(ally_data_b);
					ally_data_sum = ally_data_a_sum + ally_data_b_sum;
					if (options.type === "violin") {
						dataset.a.data.push(ally_data_a);
						dataset.b.data.push(ally_data_b);
					}
					else {
						dataset.a.data.push(ally_data_a_sum);
						dataset.b.data.push(ally_data_b_sum);
					}
					dataset.sum.data.push(ally_data_sum);
					break;
				case "loot_res":
					ally_data_a = ally_data.map(elem => elem.loot_res);
					ally_data_a_sum = sum_array_elements(ally_data_a);
					if (options.type === "violin") {
						dataset.a.data.push(ally_data_a);
					}
					dataset.sum.data.push(ally_data_a_sum);
					break;
				case "scavenge":
					ally_data_a = ally_data.map(elem => elem.scavenge);
					ally_data_a_sum = sum_array_elements(ally_data_a);
					if (options.type === "violin") {
						dataset.a.data.push(ally_data_a);
					}
					dataset.sum.data.push(ally_data_a_sum);
					break;
				case "conquer":
					ally_data_a = ally_data.map(elem => elem.conquer);
					ally_data_a_sum = sum_array_elements(ally_data_a);
					if (options.type === "violin") {
						dataset.a.data.push(ally_data_a);
					}
					dataset.sum.data.push(ally_data_a_sum);
					break;
				case "kill_att":
					ally_data_a = ally_data.map(elem => elem.kill_att);
					ally_data_a_sum = sum_array_elements(ally_data_a);
					if (options.type === "violin") {
						dataset.a.data.push(ally_data_a);
					}
					dataset.sum.data.push(ally_data_a_sum);
					break;
				case "kill_def":
					ally_data_a = ally_data.map(elem => elem.kill_def);
					ally_data_a_sum = sum_array_elements(ally_data_a);
					if (options.type === "violin") {
						dataset.a.data.push(ally_data_a);
					}
					dataset.sum.data.push(ally_data_a_sum);
					break;
				case "kill_sup":
					ally_data_a = ally_data.map(elem => elem.kill_sup);
					ally_data_a_sum = sum_array_elements(ally_data_a);
					if (options.type === "violin") {
						dataset.a.data.push(ally_data_a);
					}
					dataset.sum.data.push(ally_data_a_sum);
					break;
				case "kill_all":
					ally_data_a = ally_data.map(elem => elem.kill_att);
					ally_data_b = ally_data.map(elem => elem.kill_def);
					ally_data_c = ally_data.map(elem => elem.kill_sup);
					ally_data_a_sum = sum_array_elements(ally_data_a);
					ally_data_b_sum = sum_array_elements(ally_data_b);
					ally_data_c_sum = sum_array_elements(ally_data_c);
					ally_data_sum = ally_data_a_sum + ally_data_b_sum + ally_data_c_sum;
					if (options.type === "violin") {
						dataset.a.data.push(ally_data_a);
						dataset.b.data.push(ally_data_b);
						dataset.c.data.push(ally_data_c);
					}
					else {
						dataset.a.data.push(ally_data_a_sum);
						dataset.b.data.push(ally_data_b_sum);
						dataset.c.data.push(ally_data_c_sum);
					}
					dataset.sum.data.push(ally_data_sum);
					break;
				default:
					break;
			}
		}
		create_chart(dataset, ally_tags);
	}
	function daily_stat_players_in_tribe(scope) {
		date.setTime(fs.statSync(`${botSettings.locations.daily_stats}${options.server}.json`).ctime.getTime() - 24 * 60 * 60 * 1000);
		const ally = get_ally_by_tag(options.ally);
		if (!ally) { return; }
		const players_in_ally = get_players_in_ally(ally.split(",")[botSettings.base_config.map_data.ally.data.indexOf("id")]);
		const players_in_ally_sorted = players_in_ally.sort(sort_player_by_rank);
		const players_name = players_in_ally_sorted.map(player => decodeURIComponent(player.split(",")[botSettings.base_config.map_data.player.data.indexOf("name")].replaceAll("+", " ")));
		const players_id = players_in_ally_sorted.map(player => player.split(",")[botSettings.base_config.map_data.player.data.indexOf("id")]);
		const dataset = get_empty_dataset();
		for (const player_id of players_id) {
			const player = botSettings.cache.daily_stats[options.server][player_id];
			let player_data_a, player_data_b, player_data_c, player_data_sum;
			switch (scope) {
				case "loot_res + scavenge":
					player_data_a = player?.loot_res > 0 ? player.loot_res : 0;
					player_data_b = player?.scavenge > 0 ? player.scavenge : 0;
					player_data_sum = player_data_a + player_data_b;
					dataset.a.data.push(player_data_a);
					dataset.b.data.push(player_data_b);
					dataset.sum.data.push(player_data_sum);
					break;
				case "loot_res":
					player_data_sum = player?.loot_res > 0 ? player.loot_res : 0;
					dataset.sum.data.push(player_data_sum);
					break;
				case "scavenge":
					player_data_sum = player?.scavenge > 0 ? player.scavenge : 0;
					dataset.sum.data.push(player_data_sum);
					break;
				case "conquer":
					player_data_sum = player?.conquer > 0 ? player.conquer : 0;
					dataset.sum.data.push(player_data_sum);
					break;
				case "kill_att":
					player_data_sum = player?.kill_att > 0 ? player.kill_att : 0;
					dataset.sum.data.push(player_data_sum);
					break;
				case "kill_def":
					player_data_sum = player?.kill_def > 0 ? player.kill_def : 0;
					dataset.sum.data.push(player_data_sum);
					break;
				case "kill_sup":
					player_data_sum = player?.kill_sup > 0 ? player.kill_sup : 0;
					dataset.sum.data.push(player_data_sum);
					break;
				case "kill_all":
					player_data_a = player?.kill_att > 0 ? player.kill_att : 0;
					player_data_b = player?.kill_def > 0 ? player.kill_def : 0;
					player_data_c = player?.kill_sup > 0 ? player.kill_sup : 0;
					player_data_sum = player_data_a + player_data_b + player_data_c;
					dataset.a.data.push(player_data_a);
					dataset.b.data.push(player_data_b);
					dataset.c.data.push(player_data_c);
					dataset.sum.data.push(player_data_sum);
					break;
				default:
					break;
			}
		}
		create_chart(dataset, players_name);
	}
	function stat_tribe(scope) {
		const map_ally_sorted = botSettings.cache.map_ally[options.server].sort(sort_ally_by_rank);
		const first_x_ally = map_ally_sorted.slice(0, options.size);
		const ally_tags = get_ally_tagnames(first_x_ally);
		const ally_ids = get_ally_ids(first_x_ally);
		const dataset = get_empty_dataset();
		for (const ally of ally_ids) {
			const ally_data = Object.values(botSettings.cache.map_player[options.server]).filter(player => player.split(",")[botSettings.base_config.map_data.player.data.indexOf("ally")] === ally);
			const players_in_ally = ally_data.map(player => player.split(",")[botSettings.base_config.map_data.ally.data.indexOf("id")]);
			let ally_data_a, ally_data_a_sum, ally_data_b, ally_data_b_sum, ally_data_c, ally_data_c_sum, ally_data_sum;
			switch (scope.includes("all")) {
				case false:
					ally_data_a = (botSettings.cache[`map_${scope}`][options.server]).filter(player => players_in_ally.includes(player.split(",")[botSettings.base_config.map_data[scope].data.indexOf("id")])).map(player => +player.split(",")[botSettings.base_config.map_data[scope].data.indexOf("kills")]);
					ally_data_a_sum = sum_array_elements(ally_data_a);
					if (options.type === "violin") {
						dataset.a.data.push(ally_data_a);
					}
					dataset.sum.data.push(ally_data_a_sum);
					break;
				case true:
					ally_data_a = (botSettings.cache["map_kill_att"][options.server]).filter(player => players_in_ally.includes(player.split(",")[botSettings.base_config.map_data[scope].data.indexOf("id")])).map(player => +player.split(",")[botSettings.base_config.map_data["kill_att"].data.indexOf("kills")]);
					ally_data_b = (botSettings.cache["map_kill_def"][options.server]).filter(player => players_in_ally.includes(player.split(",")[botSettings.base_config.map_data[scope].data.indexOf("id")])).map(player => +player.split(",")[botSettings.base_config.map_data["kill_def"].data.indexOf("kills")]);
					ally_data_c = (botSettings.cache["map_kill_sup"][options.server]).filter(player => players_in_ally.includes(player.split(",")[botSettings.base_config.map_data[scope].data.indexOf("id")])).map(player => +player.split(",")[botSettings.base_config.map_data["kill_sup"].data.indexOf("kills")]);
					ally_data_a_sum = sum_array_elements(ally_data_a);
					ally_data_b_sum = sum_array_elements(ally_data_b);
					ally_data_c_sum = sum_array_elements(ally_data_c);
					ally_data_sum = ally_data_a_sum + ally_data_b_sum + ally_data_c_sum;
					if (options.type === "violin") {
						dataset.a.data.push(ally_data_a);
						dataset.b.data.push(ally_data_b);
						dataset.c.data.push(ally_data_c);
					}
					else {
						dataset.a.data.push(ally_data_a_sum);
						dataset.b.data.push(ally_data_b_sum);
						dataset.c.data.push(ally_data_c_sum);
					}
					dataset.sum.data.push(ally_data_sum);
					break;
				default:
					break;
			}
		}
		create_chart(dataset, ally_tags);
	}
	function stat_players_in_tribe(scope) {
		const ally = get_ally_by_tag(options.ally);
		if (!ally) { return; }
		const players_in_ally = get_players_in_ally(ally.split(",")[botSettings.base_config.map_data.ally.data.indexOf("id")]);
		const players_in_ally_sorted = players_in_ally.sort(sort_player_by_rank);
		const players_name = players_in_ally_sorted.map(player => decodeURIComponent(player.split(",")[botSettings.base_config.map_data.player.data.indexOf("name")].replaceAll("+", " ")));
		const players_id = players_in_ally_sorted.map(player => player.split(",")[botSettings.base_config.map_data.player.data.indexOf("id")]);
		const dataset = get_empty_dataset();
		for (const player_id of players_id) {
			let player_data_a, player_data_b, player_data_c, player_data_sum;
			switch (scope.includes("all")) {
				case false:
					player_data_sum = (botSettings.cache[`map_${scope}`][options.server]).find(player => player.split(",")[botSettings.base_config.map_data[scope].data.indexOf("id")] === player_id)?.split(",")[botSettings.base_config.map_data[scope]?.data.indexOf("kills")] ?? 0;
					dataset.sum.data.push(+player_data_sum);
					break;
				case true:
					player_data_a = (botSettings.cache["map_kill_att"][options.server]).find(player => player.split(",")[botSettings.base_config.map_data["kill_att"].data.indexOf("id")] === player_id)?.split(",")[botSettings.base_config.map_data["kill_att"]?.data.indexOf("kills")] ?? 0;
					player_data_b = (botSettings.cache["map_kill_def"][options.server]).find(player => player.split(",")[botSettings.base_config.map_data["kill_def"].data.indexOf("id")] === player_id)?.split(",")[botSettings.base_config.map_data["kill_def"]?.data.indexOf("kills")] ?? 0;
					player_data_c = (botSettings.cache["map_kill_sup"][options.server]).find(player => player.split(",")[botSettings.base_config.map_data["kill_sup"].data.indexOf("id")] === player_id)?.split(",")[botSettings.base_config.map_data["kill_sup"]?.data.indexOf("kills")] ?? 0;
					player_data_sum = +player_data_a + +player_data_b + +player_data_c;
					dataset.a.data.push(+player_data_a);
					dataset.b.data.push(+player_data_b);
					dataset.c.data.push(+player_data_c);
					dataset.sum.data.push(player_data_sum);
					break;
				default:
					break;
			}
		}
		create_chart(dataset, players_name);
	}
	function stat_conquer() {
		// server, ally, enemy, barbarian, continent, from, to    chart type, style, color, size
		let dataset = {};
		const conquers_data = botSettings.base_config.map_data.conquer.data;
		const ally_data = botSettings.base_config.map_data.ally.data;
		const player_data = botSettings.base_config.map_data.player.data;
		const map_conquers = botSettings.cache.map_conquer[options.server];
		const map_player_sorted = botSettings.cache.map_player[options.server].sort(sort_player_by_rank);
		const map_ally_sorted = botSettings.cache.map_ally[options.server].sort(sort_ally_by_rank);
		const first_x_ally = map_ally_sorted.slice(0, options.size);
		const ally_tags = get_ally_tagnames(first_x_ally);
		function date_reformat(date, type) {
			const date_time = new Date();
			if (date) {
				const time = date.split(/[ _,./:;-]/);
				const format = time.map(year => year.length > 3).indexOf(true);
				switch (format) {
					case 0:
						if (+time[1] > 12) { interaction.reply({ content: `Date format is not valid!`, ephemeral: true }); return; }
						if (+time[2] > 31) { interaction.reply({ content: `Date format is not valid!`, ephemeral: true }); return; }
						date_time.setFullYear(+time[0]);
						date_time.setMonth(+time[1] - 1);
						date_time.setDate(+time[2]);
						break;
					case 2:
						if (+time[1] > 12) { interaction.reply({ content: `Date format is not valid!`, ephemeral: true }); return; }
						if (+time[0] > 31) { interaction.reply({ content: `Date format is not valid!`, ephemeral: true }); return; }
						date_time.setFullYear(+time[2]);
						date_time.setMonth(+time[1] - 1);
						date_time.setDate(+time[0]);
						break;
					default:
						interaction.reply({ content: `Date format is not valid!`, ephemeral: true });
						return;
				}
			}
			else {
				switch (type) {
					case "from":
						const first_conquer = map_conquers[0].split(',')[conquers_data.indexOf("unix_timestamp")];
						date_time.setTime(+`${first_conquer}000`);
						break;
				}
			}
			return date_time;
		}
		const from_date = date_reformat(options.from, "from");
		const to_date = date_reformat(options.to, "to");
		const conquers = map_conquers.filter(conquer => +`${conquer.split(",")[conquers_data.indexOf("unix_timestamp")]}000` >= from_date.getTime() && +`${conquer.split(",")[conquers_data.indexOf("unix_timestamp")]}000` <= to_date.getTime());
		options.ally?.split("&");
		options.enemy?.split("&");
		switch (options?.ally) {
			case "":  //nincs klán beírva
				//top 10 vagy x klánból szed adatokat barbár foglalással együtt vagy nélkül
				//kontinensre szűrve
				dataset = {
					gain: {
						label: "gain",
						data: []
					},
					barb: {
						label: "barb",
						data: []
					},
					internal: {
						label: "internal",
						data: []
					},
					self: {
						label: "self",
						data: []
					},
					lose: {
						label: "lose",
						data: []
					},
					sum: {
						label: "sum",
						data: []
					}
				};
				for (const ally of first_x_ally) {
					const ally_splitted = ally.split(",");
					const players_in_ally = get_players_in_ally(ally_splitted[ally_data.indexOf("id")]);
					const players_in_ally_id = players_in_ally.map(player => player.split(",")[player_data.indexOf("id")]);
					const ally_gain = conquers.filter(conquer => players_in_ally_id.includes(conquer.split(",")[conquers_data.indexOf("new_owner")]) && !players_in_ally_id.includes(conquer.split(",")[conquers_data.indexOf("old_owner")]) && conquer.split(",")[conquers_data.indexOf("old_owner")] !== "0");
					const ally_lose = conquers.filter(conquer => players_in_ally_id.includes(conquer.split(",")[conquers_data.indexOf("old_owner")]) && !players_in_ally_id.includes(conquer.split(",")[conquers_data.indexOf("new_owner")]));
					const ally_barb = conquers.filter(conquer => players_in_ally_id.includes(conquer.split(",")[conquers_data.indexOf("new_owner")]) && conquer.split(",")[conquers_data.indexOf("old_owner")] === "0");
					const ally_internal = conquers.filter(conquer => players_in_ally_id.includes(conquer.split(",")[conquers_data.indexOf("new_owner")]) && players_in_ally_id.includes(conquer.split(",")[conquers_data.indexOf("old_owner")]) && conquer.split(",")[conquers_data.indexOf("new_owner")] !== conquer.split(",")[conquers_data.indexOf("old_owner")]);
					const ally_self = conquers.filter(conquer => players_in_ally_id.includes(conquer.split(",")[conquers_data.indexOf("new_owner")]) && conquer.split(",")[conquers_data.indexOf("new_owner")] === conquer.split(",")[conquers_data.indexOf("old_owner")]);
					const ally_sum = ally_gain.length + ally_barb.length - ally_lose.length;
					if (options.type === "violin") {
						const ally_dataset = {
							gain: [],
							barb: [],
							internal: [],
							self: [],
							lose: [],
							sum: []
						}
						for (const player of players_in_ally_id) {
							const player_gain = ally_gain.filter(conquer => conquer.split(",")[conquers_data.indexOf("new_owner")] === player);
							const player_lose = ally_lose.filter(conquer => conquer.split(",")[conquers_data.indexOf("old_owner")] === player);
							const player_barb = ally_barb.filter(conquer => conquer.split(",")[conquers_data.indexOf("new_owner")] === player);
							const player_internal = ally_internal.filter(conquer => conquer.split(",")[conquers_data.indexOf("new_owner")] === player);
							const player_self = ally_self.filter(conquer => conquer.split(",")[conquers_data.indexOf("new_owner")] === player);
							const player_sum = player_gain.length + player_barb.length - player_lose.length;
							ally_dataset.gain.push(player_gain.length);
							ally_dataset.lose.push(player_lose.length);
							ally_dataset.barb.push(player_barb.length);
							ally_dataset.internal.push(player_internal.length);
							ally_dataset.self.push(player_self.length);
							ally_dataset.sum.push(player_sum);
						}
						dataset.gain.data.push(ally_dataset.gain);
						dataset.lose.data.push(ally_dataset.lose);
						dataset.barb.data.push(ally_dataset.barb);
						dataset.internal.data.push(ally_dataset.internal);
						dataset.self.data.push(ally_dataset.self);
						dataset.sum.data.push(ally_dataset.sum);
					}
					else {
						dataset.gain.data.push(ally_gain.length);
						dataset.lose.data.push(ally_lose.length);
						dataset.barb.data.push(ally_barb.length);
						dataset.internal.data.push(ally_internal.length);
						dataset.self.data.push(ally_self.length);
						dataset.sum.data.push(ally_sum);
					}
				}
				create_chart(dataset, ally_tags, from_date, to_date);
				//ha a stat típus bar/line akkor külön jeleníti meg a foglalásokat típusonként
				//ha pie akkor összesít
				//ha violin akkor az adatokat a klánból minden egyes játékosra külön szedi ki
				break;
			default:  //van klán beírva
				switch (options?.enemy) {
					case "nincs_enemy":
						//a klán foglalásait mutatja a foglalt klánoktól és külön a barbárt ha be van jelölve kontira szűrve
						break;
					default: // van enemy
						//leszűri a klánok foglalásait szimplán
						//klánok egyesítve vagy külön megjelenítése stat típus alapján
						break;
				}
				break;
		}
	}
	async function stat_monthly(scope) {
		options.type = "line";
		const data = {};
		const tw_stat_index = {
			date: 0,
			name: 1,
			ally: 2,
			rank: 3,
			points: 4,
			villages: 5,
			kill_all: 6,
			kill_att: 7,
			kill_def: 8
		};
		const market = botSettings.base_config.markets.find(market => market.market === options.server.substring(0, 2));
		if (options.player) {
			const players = options.player.split("&");
			for (const player of players) {
				const player_data = get_player_by_id(player)?.split(",");
				if (!player_data) { continue; }
				for (let month = 0; month < options.month; month++) {
					await get_player_data(player, month);
				}
			}
			options.player = [...new Set(Object.values(data).flatMap(entry => Object.keys(entry)))].join(",");
			async function get_player_data(id, month) {
				const link = `${market.twstat}${options.server}/index.php?page=player&id=${id}&tab=history&pn=${month + 1}`;
				const url_data = await axios.get(link);
				if (url_data.status !== 200) { return; }
				const dom = new JSDOM(url_data.data);
				const table = dom.window.document.getElementById("history");
				const rows = [...table.rows];
				rows.shift();
				rows.forEach(row => {
					const row_date = row.cells[tw_stat_index.date].textContent.slice(-5);
					typeof data[row_date] === "undefined" ? data[row_date] = {} : null;
					const name = row.cells[tw_stat_index.name].textContent;
					data[row_date][name] = {
						name: row.cells[tw_stat_index.name].textContent,
						ally: row.cells[tw_stat_index.ally].textContent,
						rank: +row.cells[tw_stat_index.rank].textContent.replace(/\D/g, ""),
						points: +row.cells[tw_stat_index.points].textContent.replace(/\D/g, ""),
						villages: +row.cells[tw_stat_index.villages].textContent.replace(/\D/g, ""),
						kill_all: +row.cells[tw_stat_index.kill_all].textContent.replace(/\D/g, ""),
						kill_att: +row.cells[tw_stat_index.kill_att].textContent.replace(/\D/g, ""),
						kill_def: +row.cells[tw_stat_index.kill_def].textContent.replace(/\D/g, "")
					};
					const this_data = data[row_date][name];
					this_data["kill_sup"] = this_data.kill_all - this_data.kill_att - this_data.kill_def;
				});
			}
		}
		else if (options.ally) {
			tw_stat_index.rank = 2;
			const allies = options.ally.split("&");
			for (const ally of allies) {
				const ally_data = get_ally_by_tag(ally)?.split(",");
				if (!ally_data) { continue; }
				const ally_id = ally_data[botSettings.base_config.map_data.ally.data.indexOf("id")];
				for (let month = 0; month < options.month; month++) {
					await get_ally_data(ally_id, month);
				}
			}
			options.ally = [...new Set(Object.values(data).flatMap(entry => Object.keys(entry)))].join(",");
			async function get_ally_data(ally_id, month) {
				const link = `${market.twstat}${options.server}/index.php?page=tribe&id=${ally_id}&tab=history&pn=${month + 1}`;
				const url_data = await axios.get(link);
				if (url_data.status !== 200) { return; }
				const dom = new JSDOM(url_data.data);
				const table = dom.window.document.getElementById("history");
				const rows = [...table.rows];
				rows.shift();
				rows.forEach(row => {
					const row_date = row.cells[tw_stat_index.date].textContent.slice(-5);
					typeof data[row_date] === "undefined" ? data[row_date] = {} : null;
					const name = row.cells[tw_stat_index.name].textContent;
					data[row_date][name] = {
						name: row.cells[tw_stat_index.name].textContent,
						ally: row.cells[tw_stat_index.ally].textContent,
						rank: +row.cells[tw_stat_index.rank].textContent.replace(/\D/g, ""),
						points: +row.cells[tw_stat_index.points].textContent.replace(/\D/g, ""),
						villages: +row.cells[tw_stat_index.villages].textContent.replace(/\D/g, ""),
						kill_all: +row.cells[tw_stat_index.kill_all].textContent.replace(/\D/g, ""),
						kill_att: +row.cells[tw_stat_index.kill_att].textContent.replace(/\D/g, ""),
						kill_def: +row.cells[tw_stat_index.kill_def].textContent.replace(/\D/g, "")
					};
					const this_data = data[row_date][name];
					this_data["kill_sup"] = this_data.kill_all - this_data.kill_att - this_data.kill_def;
				});
			}
		}
		else {
			const map_ally_sorted = botSettings.cache.map_ally[options.server].sort(sort_ally_by_rank);
			const first_x_ally = map_ally_sorted.slice(0, options.size);
			const ally_tags = get_ally_tagnames(first_x_ally);
			options.ally = ally_tags.join("&");
			stat_monthly(scope);
			return;
		}
		const dataset = get_empty_dataset();
		const scopes = scope.split("-");
		const entries = [...new Set(Object.values(data).flatMap(entry => Object.keys(entry)))];
		switch (scopes.length) {
			case 2:
				if (entries.length > 1) { populate_multiple_entry_dataset(); }
				else {
					dataset.a.data = Object.values(data).map(day => day[entries[0]]?.[scopes[0]] ?? 0).reverse();
					dataset.b.data = Object.values(data).map(day => day[entries[0]]?.[scopes[1]] ?? 0).reverse();
					dataset.sum.data = Object.values(data).map(day => day[entries[0]]?.[scopes[0]] ?? 0).reverse();
				}
				break;
			default:
				if (entries.length > 1) { populate_multiple_entry_dataset(); }
				else {
					if (scopes[0] === "kill_all") {
						dataset.a.data = Object.values(data).map(day => day[entries[0]]?.kill_att ?? 0).reverse();
						dataset.b.data = Object.values(data).map(day => day[entries[0]]?.kill_def ?? 0).reverse();
						dataset.c.data = Object.values(data).map(day => day[entries[0]]?.kill_sup ?? 0).reverse();
						dataset.sum.data = Object.values(data).map(day => day[entries[0]]?.kill_all ?? 0).reverse();
					}
					else {
						dataset.a.data = Object.values(data).map(day => day[entries[0]]?.[scopes[0]] ?? 0).reverse();
						dataset.sum.data = Object.values(data).map(day => day[entries[0]]?.[scopes[0]] ?? 0).reverse();
					}
				}
				break;
		}
		function populate_multiple_entry_dataset() {
			delete dataset.a;
			delete dataset.b;
			delete dataset.c;
			delete dataset.sum;
			for (const entry of entries) {
				dataset[entry] = {
					label: entry,
					fill: false,
					data: Object.values(data).map(day => day[entry]?.[scopes[0]] ?? 0).reverse()
				};
			}
		}
		const data_labels = Object.keys(data).reverse();
		if (data_labels.length > 20) {
			for (let label = 1; label < data_labels.length; label += 2) {
				data_labels[label] = "";
			}
		}
		create_chart(dataset, data_labels);
	}
	function get_empty_dataset() {
		const empty_dataset = {
			a: {
				label: "a",
				data: []
			},
			b: {
				label: "b",
				data: []
			},
			c: {
				label: "c",
				data: []
			},
			sum: {
				label: "sum",
				data: []
			}
		};
		return empty_dataset;
	}
	function sort_ally_by_rank(a, b) {
		var ally_rank_a = +a.split(',')[botSettings.base_config.map_data.ally.data.indexOf("rank")];
		var ally_rank_b = +b.split(',')[botSettings.base_config.map_data.ally.data.indexOf("rank")];
		return ally_rank_a - ally_rank_b;
	}
	function sort_player_by_rank(a, b) {
		var player_rank_a = +a.split(',')[botSettings.base_config.map_data.player.data.indexOf("rank")];
		var player_rank_b = +b.split(',')[botSettings.base_config.map_data.player.data.indexOf("rank")];
		return player_rank_a - player_rank_b;
	}
	function get_ally_tagnames(allies) {
		return allies.map(ally => decodeURIComponent(ally.split(",")[botSettings.base_config.map_data.ally.data.indexOf("tag")]?.replaceAll("+", " ")));
	}
	function get_ally_ids(allies) {
		return allies.map(ally => ally.split(",")[botSettings.base_config.map_data.ally.data.indexOf("id")]);
	}
	function get_ally_by_tag(ally_tag) {
		return botSettings.cache.map_ally[options.server].find(ally => decodeURIComponent(ally.split(",")[botSettings.base_config.map_data.ally.data.indexOf("tag")]?.replaceAll("+", " ")) === ally_tag);
	}
	function get_player_by_id(id) {
		return botSettings.cache.map_player[options.server].find(player => {
			return player.split(",")[botSettings.base_config.map_data.player.data.indexOf("id")] === id;
		});
	}
	function get_players_in_ally(ally_id) {
		return botSettings.cache.map_player[options.server].filter(player => player.split(",")[botSettings.base_config.map_data.player.data.indexOf("ally")] === ally_id);
	}
	function sum_array_elements(array) {
		return array.reduce(function (acc, curr) {
			if (typeof curr === 'number') {
				return acc + curr;
			} else {
				return acc;
			}
		}, 0);
	}
	function generate_title(from_date, to_date) {
		if (options.command === "daily") {
			if (options.ally === "") {
				return `${botSettings.base_config.translations.chart[use_locale]["title"]["daily"]} ${botSettings.base_config.translations.chart[use_locale]["title"][options.scope]} ${botSettings.base_config.translations.chart[use_locale]["title"]["stat"]}     ${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
			}
			else {
				return `${options.ally}  ${botSettings.base_config.translations.chart[use_locale]["title"]["daily"]} ${botSettings.base_config.translations.chart[use_locale]["title"][options.scope]} ${botSettings.base_config.translations.chart[use_locale]["title"]["stat"]}     ${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
			}
		}
		else if (options.command === "monthly") {
			return [
				`${options.player ? options.player : options.ally}`,
				`${botSettings.base_config.translations.chart[use_locale]["title"][options.scope]}`,
				`${botSettings.base_config.translations.chart[use_locale]["title"]["stat"]}`
			].join(" ");
		}
		else if (options.command === "conquer") {
			const from_date_formatted = `${from_date.getFullYear()}.${from_date.getMonth() + 1}.${from_date.getDate()}`;
			const to_date_formatted = `${to_date.getFullYear()}.${to_date.getMonth() + 1}.${to_date.getDate()}`;
			return `${options.server} Top ${options.size} klán foglalás statisztika   ${from_date_formatted}-${to_date_formatted}`;
		}
		else if (options.command === "od") {
			if (options.ally === "") {
				return `${botSettings.base_config.translations.chart[use_locale]["title"][options.scope]} ${botSettings.base_config.translations.chart[use_locale]["title"]["stat"]}     ${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
			}
			else {
				return `${options.ally}  ${botSettings.base_config.translations.chart[use_locale]["title"][options.scope]} ${botSettings.base_config.translations.chart[use_locale]["title"]["stat"]}     ${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
			}
		}
		else { }
	}
	function generate_dataset_labels(chart_data) {
		const datasets = chart_data.data.datasets;
		if (options.command === "conquer") { }
		else if (options.command === "monthly" && (options.player.includes(",") || options.ally.includes(","))) { }
		else {
			try {
				datasets.forEach(dataset => dataset.label = botSettings.base_config.translations.chart[use_locale]["dataset_label"][options.scope][options.style][dataset.label] ?? dataset.label);
			}
			catch (error) {
				datasets.forEach(dataset => dataset.label = botSettings.base_config.translations.chart[use_locale]["dataset_label"][options.scope]["combined"]["sum"] ?? dataset.label);
			}
		}
	}
	function push_datasets_to_chart_data(chart_data, datasets) {
		if (options.command === "conquer") {
			Object.values(datasets).forEach(data => chart_data.data.datasets.push(data));
		}
		else {
			const filled_data_arrays = Object.values(datasets).filter(obj => obj.data.length > 0).length;
			if (options.style === "combined") { delete datasets.a; delete datasets.b; delete datasets.c; }
			else if (filled_data_arrays > 1 || options.type === "violin") { delete datasets.sum; }
			else { options.style = "combined"; delete datasets.a; delete datasets.b; delete datasets.c; }
			Object.keys(datasets).forEach(key => {
				if (datasets[key].data.length === 0) {
					delete datasets[key];
				}
			});
			Object.values(datasets).forEach(data => chart_data.data.datasets.push(data));
		}
	}
	function format_chart(datasets, datalabels, from_date, to_date) {
		const chart_data = {
			data: {
				labels: datalabels,
				datasets: [],
			}
		};
		const default_options = {
			layout: {
				padding: {
					left: 0,
					right: 0,
					top: 0,
					bottom: 0,
				},
			},
			title: {
				display: true,
				text: generate_title(from_date, to_date),
				position: 'top',
				fontColor: 'white',
				fontStyle: 'bold',
				fontSize: 14,
				lineHeight: 1.2,
				padding: 10
			},
			legend: {
				display: true,
				position: 'top',
				labels: {
					boxWidth: 40,
					fontSize: 12,
					fontStyle: 'normal',
					fontColor: 'white',
				},
			},
			scales: {
				xAxes: [
					{
						stacked: false,
						gridLines: {
							display: false,
							color: 'grey',
							drawTicks: true,
						},
						ticks: {
							display: true,
							fontColor: 'white',
							fontSize: 12,
							fontStyle: 'normal',
						},
					},
				],
				yAxes: [
					{
						stacked: false,
						gridLines: {
							display: true,
							color: 'grey',
							drawTicks: true,
						},
						ticks: {
							display: true,
							fontColor: 'white',
							fontSize: 12,
							fontStyle: 'normal',
							callback: function (value) {
								if (value >= 1000000) {
									return (value / 1000000).toFixed(1) + 'm';
								}
								else if (value >= 1000) {
									return (value / 1000).toFixed(1) + 'k';
								}
								else {
									return value;
								}
							}
						},
					},
				],
			},
			plugins: {
				datalabels: {
					display: true,
					color: "white",
					align: "end",
					anchor: "end",
					rotation: -25,
					padding: 0
				},
				colorschemes: {
					scheme: 'tableau.Classic10'
				}
			}
		}
		push_datasets_to_chart_data(chart_data, datasets);
		generate_dataset_labels(chart_data);
		chart_data.type = options.type;
		chart_data.options = {
			title: default_options.title,
			layout: default_options.layout,
			legend: default_options.legend,
			scales: default_options.scales,
			plugins: default_options.plugins,
			responsive: false
		};
		switch (options.style) {
			case "individual":
				chart_data.options.plugins.datalabels.rotation = -90;
				switch (chart_data.type) {
					case "bar":
						break;
					case "line":
						chart_data.options.plugins.datalabels.display = false;
						break;
					case "pie":
						chart_data.options.scales.yAxes[0].gridLines.display = false;
						chart_data.options.scales.yAxes[0].ticks.display = false;
						chart_data.options.scales.xAxes[0].ticks.display = false;
						chart_data.options.legend.display = true;
						chart_data.options.legend.position = "right";
						chart_data.options.plugins.datalabels.rotation = 0;
						chart_data.options.plugins.datalabels.align = "center";
						chart_data.options.plugins.datalabels.anchor = "center";
						chart_data.options.title.lineHeight = 3;
						chart_data.options.title.padding = 0;
						chart_data.options.layout.padding.bottom = 5;
						break;
					case "violin":
						chart_data.options.plugins.datalabels.display = false;
						break;
				}
				if (options.command === "monthly") {
					if (options.scope.split("-").length === 2 && (!options.player.includes(",") || !options.ally.includes(","))) {
						chart_data.data.datasets[0]["yAxisID"] = "y";
						chart_data.data.datasets[1]["yAxisID"] = "y1";
						chart_data.options.scales.yAxes[0]["id"] = "y";
						chart_data.options.scales.yAxes[0]["position"] = "left";
						chart_data.options.scales.yAxes[0]["scaleLabel"] = {
							"labelString": botSettings.base_config.translations.chart[use_locale]["dataset_label"][options.scope.split("-")[0]]["combined"]["sum"],
							"display": true,
							"padding": 0,
							"fontColor": 'white'
						};
						chart_data.options.scales.yAxes.push({
							"id": "y1",
							"type": "linear",
							"display": true,
							"position": "right",
							"gridLines": {
								"drawOnChartArea": false
							},
							"ticks": {
								"display": true,
								"fontColor": 'white',
								"fontSize": 12,
								"fontStyle": 'normal',
								callback: function (value) {
									if (value >= 1000000) {
										return (value / 1000000).toFixed(1) + 'm';
									}
									else if (value >= 1000) {
										return (value / 1000).toFixed(1) + 'k';
									}
									else {
										return value;
									}
								}
							},
							"scaleLabel": {
								"labelString": botSettings.base_config.translations.chart[use_locale]["dataset_label"][options.scope.split("-")[1]]["combined"]["sum"],
								"display": true,
								"padding": 0,
								"fontColor": 'white'
							}
						});
					}
				}
				break;
			case "stacked":
				switch (chart_data.type) {
					case "bar":
						break;
					case "line":
						chart_data.options.plugins.datalabels.display = false;
						break;
					case "pie":
						chart_data.options.scales.yAxes[0].gridLines.display = false;
						chart_data.options.scales.yAxes[0].ticks.display = false;
						chart_data.options.scales.xAxes[0].ticks.display = false;
						chart_data.options.legend.display = true;
						chart_data.options.legend.position = "right";
						chart_data.options.plugins.datalabels.rotation = 0;
						chart_data.options.plugins.datalabels.align = "center";
						chart_data.options.plugins.datalabels.anchor = "center";
						chart_data.options.title.lineHeight = 3;
						chart_data.options.title.padding = 0;
						chart_data.options.layout.padding.bottom = 5;
						break;
					case "violin":
						chart_data.options.plugins.datalabels.display = false;
						break;
				}
				chart_data.options.scales.xAxes[0].stacked = false;
				chart_data.options.scales.yAxes[0].stacked = true;
				chart_data.options.plugins.datalabels.rotation = -90;
				break;
			case "combined":
				chart_data.options.legend.display = false;
				switch (chart_data.type) {
					case "bar":
						break;
					case "line":
						break;
					case "pie":
						chart_data.options.scales.yAxes[0].gridLines.display = false;
						chart_data.options.scales.yAxes[0].ticks.display = false;
						chart_data.options.scales.xAxes[0].ticks.display = false;
						chart_data.options.legend.display = true;
						chart_data.options.legend.position = "right";
						chart_data.options.plugins.datalabels.rotation = 0;
						chart_data.options.title.lineHeight = 3;
						chart_data.options.title.padding = 0;
						chart_data.options.layout.padding.bottom = 5;
						break;
					case "violin":
						chart_data.options.scales.yAxes[0].gridLines.display = false;
						chart_data.options.scales.yAxes[0].ticks.display = false;
						break;
				}
				break;
		}
		switch (options.color) {
			case "transparent":
				chart_data.options.title.fontColor = "black";
				chart_data.options.legend.labels.fontColor = "black";
				chart_data.options.scales.xAxes[0].ticks.fontColor = "black";
				chart_data.options.scales.yAxes[0].ticks.fontColor = "black";
				chart_data.options.scales.yAxes[0]?.["scaleLabel"]?.["fontColor"] ? chart_data.options.scales.yAxes[0]["scaleLabel"]["fontColor"] = "black" : null;
				chart_data.options.scales.yAxes[1]?.["scaleLabel"]?.["fontColor"] ? chart_data.options.scales.yAxes[1]["scaleLabel"]["fontColor"] = "black" : null;
				chart_data.options.plugins.datalabels.color = "black";
				break;
			case "white":
				chart_data.options.title.fontColor = "black";
				chart_data.options.legend.labels.fontColor = "black";
				chart_data.options.scales.xAxes[0].ticks.fontColor = "black";
				chart_data.options.scales.yAxes[0].ticks.fontColor = "black";
				chart_data.options.scales.yAxes[0]?.["scaleLabel"]?.["fontColor"] ? chart_data.options.scales.yAxes[0]["scaleLabel"]["fontColor"] = "black" : null;
				chart_data.options.scales.yAxes[1]?.["scaleLabel"]?.["fontColor"] ? chart_data.options.scales.yAxes[1]["scaleLabel"]["fontColor"] = "black" : null;
				chart_data.options.plugins.datalabels.color = "black";
				break;
		}
		return chart_data;
	}
	async function create_chart(datasets, datalabels, from_date, to_date) {
		const formatted_chart = format_chart(datasets, datalabels, from_date, to_date);
		let width = Math.ceil(25 * formatted_chart.data.labels.length + 600);
		let height = formatted_chart.data.labels.length > 10 ? 600 : 400;
		if (options.type === "pie") { height = 800; }
		const chartCallback = (ChartJS) => {
			if (options.color !== "transparent") {
				ChartJS.plugins.register({
					beforeDraw: (chartInstance) => {
						const chart = chartInstance.chart
						const ctx = chart.ctx;
						ctx.fillStyle = options.color;
						ctx.fillRect(0, 0, chart.width, chart.height);
					},
				});
			}
		}
		const canvasRenderService = new CanvasRenderService(width, height, chartCallback, undefined, () => Chart);
		const buffer = await canvasRenderService.renderToBuffer(formatted_chart);
		const attachment = new AttachmentBuilder(buffer, { name: "chart.png" });
		switch (interaction) {
			case false:
				discordClient.channels.cache.get(cron.channel_id).send({ files: [attachment] });
				break;
			default:
				interaction.editReply({ files: [attachment] });
				break;
		}
	}
}
async function set_coord_info(interaction) {
	const guild = botSettings.guilds_config.find(guild => guild.guild_id === interaction.guildId);
	const use_locale = helper.translation_locale("coord_info", interaction.locale);
	const translation = botSettings.base_config.translations.coord_info[use_locale];
	const options = {
		type: interaction.options.getSubcommand(),
		server: interaction.options.getString("server") ?? "",
		channel: interaction.options.getChannel("channel")?.id ?? interaction.channelId,
		all: interaction.options.getBoolean("all") ?? false,
		active: interaction.options.getBoolean("active") ?? false,
	}
	switch (options.type) {
		case "activate":
			guild.config.coord_info.active = options.active;
			break;
		case "set_channel":
			const market = botSettings.base_config.markets.find(market => market.market === options.server.substring(0, 2));
			if (!market.enabled) {
				interaction.editReply({ content: `${translation["market_error"]}`, ephemeral: true });
				return;
			}
			if (!botSettings.base_config.running_servers.includes(options.server)) {
				interaction.editReply({ content: `${translation["server_error"]}`, ephemeral: true });
				return;
			}
			if (!options.channel) {
				interaction.editReply({ content: `${translation["channel_error"]}`, ephemeral: true });
				return;
			}
			guild.config.coord_info.channels[`${options.channel}`] = options.server;
			break;
		case "delete_channel":
			if (options.all) {
				guild.config.coord_info.channels = {};
			}
			else {
				if (!options.channel) {
					interaction.editReply({ content: `${translation["channel_error"]}`, ephemeral: true });
					return;
				}
				delete guild.config.coord_info.channels[options.channel]
			}
			break;
	}
	await mongodb.UPDATE_GUILD_CONFIG("coord_info", {
		guild_id: interaction.guild.id,
		guild_name: interaction.guild.name,
		active: guild.active,
		market: guild.market,
		coord_info: guild.config.coord_info
	});
	interaction.editReply({ content: `${translation["modified"]}`, ephemeral: true });
}
async function show_info_tribal_data(interaction, message, guild) {
	let use_locale, options;
	switch (interaction) {
		case false:
			if (!guild.config.coord_info.active) { return; }
			use_locale = helper.translation_locale("info", guild.market);
			options = {
				type: "village",
				server: guild.config.coord_info.channels[`${message.channelId}`] ? guild.config.coord_info.channels[`${message.channelId}`] : guild.global_world,
				village: message.content
			}
			break;
		default:
			guild = botSettings.guilds_config.find(guild => guild.guild_id === interaction.guildId);
			use_locale = helper.translation_locale("info", interaction.locale);
			options = {
				type: interaction.options.getSubcommand(),
				server: interaction.options.getString("server") ?? (
					guild.config.coord_info.channels[`${message?.channelId}`]
						? guild.config.coord_info.channels[`${message?.channelId}`]
						: guild.global_world
				),
				ally: interaction.options.getString("ally") ?? "",
				player: interaction.options.getString("player") ?? "",
				village: interaction.options.getString("coord") ?? "",
			}
			break;
	}
	if (!botSettings.base_config.running_servers.includes(options.server)) { return; }
	if (options[options.type] === "") { return; }
	const market = botSettings.base_config.markets.find(market => market.market === options.server.substring(0, 2));
	if (!market.enabled) { return; }
	const translation = botSettings.base_config.translations.info[use_locale];
	const indexes = {
		map_ally: botSettings.base_config.map_data.ally.data,
		map_player: botSettings.base_config.map_data.player.data,
		map_village: botSettings.base_config.map_data.village.data,
		kill: botSettings.base_config.map_data.kill_att.data,
		conquer: botSettings.base_config.map_data.conquer.data
	};
	eval(`show_${options.type}();`);

	function show_village() {
		const coords = [...new Set(options.village.match(/\d{2,3}[|]{1}\d{2,3}/g))];
		if (!coords) {
			interaction ? interaction.editReply({ content: `${translation[`${options.type}_error`]}`, ephemeral: true }) : null;
			return;
		}
		const villages_info = [];
		const fields = [];
		for (let coord of coords) {
			const village_data = get_tribal_data(options.type, coord.split("|"))?.split(",");
			if (!village_data) { continue; }
			const village = {
				village: {},
				owner: {
					ally: {}
				},
				_set_village: function () {
					this.village.data = village_data;
					this.village.id = this.village.data[indexes.map_village.indexOf("id")];
					this.village.name = decodeURIComponent(this.village.data[indexes.map_village.indexOf("name")].replaceAll("+", " "));
					this.village.coord = `${this.village.data[indexes.map_village.indexOf("x")]}|${this.village.data[indexes.map_village.indexOf("y")]}`;
					this.village.continent = get_continent_number(this.village.data);
					this.village.points = this.village.data[indexes.map_village.indexOf("points")];
					this.village.link = `https://${options.server}${market.link}/game.php?village=0&screen=info_village&id=${this.village.id}`;
					this.village.link_guest = `https://${options.server}${market.link}/guest.php?screen=info_village&id=${this.village.id}`;
				},
				_set_owner: function () {
					this.owner.id = this.village.data[indexes.map_village.indexOf("player")];
					this.owner.data = get_tribal_data("player", this.owner.id)?.split(",");
					this.owner.player = typeof this.owner.data !== "undefined" ? true : false;
					if (this.owner.player) {
						this.owner.name = decodeURIComponent(this.owner.data[indexes.map_player.indexOf("name")].replaceAll("+", " "));
						this.owner.points = this.owner.data[indexes.map_player.indexOf("points")];
						this.owner.link = `https://${options.server}${market.link}/game.php?village=0&screen=info_player&id=${this.owner.id}`;
						this.owner.link_guest = `https://${options.server}${market.link}/guest.php?screen=info_player&id=${this.owner.id}`;
						this.owner.ally.id = this.owner.data[indexes.map_player.indexOf("ally")];
						this.owner.ally.joined = this.owner.ally.id !== "0" ? true : false;
						if (this.owner.ally.joined) {
							this.owner.ally.data = get_tribal_data("ally", this.owner.ally.id)?.split(",");
							this.owner.ally.tag = decodeURIComponent(this.owner.ally.data[indexes.map_ally.indexOf("tag")].replaceAll("+", " "));
							this.owner.ally.points = this.owner.ally.data[indexes.map_ally.indexOf("all_points")];
							this.owner.ally.link = `https://${options.server}${market.link}/game.php?village=0&screen=info_ally&id=${this.owner.ally.id}`;
							this.owner.ally.link_guest = `https://${options.server}${market.link}/guest.php?screen=info_ally&id=${this.owner.ally.id}`;
						}
					}
				},
				_init: function () {
					this._set_village();
					this._set_owner();
					return this;
				}
			}._init();
			villages_info.push(village);
		}
		if (!villages_info.length) {
			interaction ? interaction.editReply({ content: `${translation[`${options.type}_error`]}`, ephemeral: true }) : null;
			return;
		}
		const owners = [...new Set(villages_info.map(village => village.owner.id))];
		for (let owner of owners) {
			const owner_data = villages_info.filter(village => village.owner.id === owner);
			const owner_field = {
				player: [
					owner_data[0].owner.player ? [
						`**`,
						`[${owner_data[0].owner.name}]`,
						`(${owner_data[0].owner.link}) `,
						` | `,
						`${format_number(owner_data[0].owner.points)}p.`,
						owner_data[0].owner.ally.joined ? [
							` | `,
							`[${owner_data[0].owner.ally.tag}]`,
							`(${owner_data[0].owner.ally.link})`
						].join("")
							: ``,
						`**`
					].join("")
						: `**${translation["barbarian"]}**`
				],
				coords: [],
				_generate_coords: function () {
					owner_data.forEach(village => {
						this.coords.push([
							`[[${village.village.coord}]]`,
							`(${village.village.link}) `,
							`${village.village.name} `,
							`${village.village.continent} `,
							`(${format_number(village.village.points)}p.)`
						].join(""));
					});
				},
				_generate: function () {
					this._generate_coords();
					fields.push(`${fields.length ? "" : "\n"}${this.player}`);
					this.coords.forEach(coord => fields.push(coord));
				}
			};
			owner_field._generate();
		}
		const embeds = [];
		for (let index = 0; index < fields.length; index += 25) {
			const embed = new EmbedBuilder();
			embed.setDescription(fields.slice(index, index + 25).join("\n"));
			embeds.push(embed);
		}
		embeds[embeds.length - 1].setFooter({ text: `${options.server} | coords: ${coords.length}` });
		interaction ?
			interaction.editReply({ embeds: embeds })
			: discordClient.channels.cache.get(message.channelId).send({ embeds: embeds, ephemeral: false });
	}
	async function show_player() {
		const owner = {
			ally: {},
			_set_owner: async function () {
				this.id = options.player;
				this.data = get_tribal_data("player", this.id)?.split(",");
				this.player = typeof this.data !== "undefined" ? true : false;
				if (this.player) {
					this.name = decodeURIComponent(this.data[indexes.map_player.indexOf("name")].replaceAll("+", " "));
					this.points = this.data[indexes.map_player.indexOf("points")];
					this.villages = this.data[indexes.map_player.indexOf("villages")];
					this.rank = this.data[indexes.map_player.indexOf("rank")];
					this.kill_att = get_kill_data("kill_att", this.id);
					this.kill_def = get_kill_data("kill_def", this.id);
					this.kill_sup = get_kill_data("kill_sup", this.id);
					this.kill_all = get_kill_data("kill_all", this.id);
					this.link = `https://${options.server}${market.link}/game.php?village=0&screen=info_player&id=${this.id}`;
					this.link_guest = `https://${options.server}${market.link}/guest.php?screen=info_player&id=${this.id}`;
					this.link_twstat = `${market.twstat}${options.server}/index.php?page=player&id=${this.id}`;
					this.image = await get_user_image(this.link_guest);
					this.ally.id = this.data[indexes.map_player.indexOf("ally")];
					this.ally.joined = this.ally.id !== "0" ? true : false;
					if (this.ally.joined) {
						this.ally.data = get_tribal_data("ally", this.ally.id)?.split(",");
						this.ally.tag = decodeURIComponent(this.ally.data[indexes.map_ally.indexOf("tag")].replaceAll("+", " "));
						this.ally.points = this.ally.data[indexes.map_ally.indexOf("all_points")];
						this.ally.link = `https://${options.server}${market.link}/game.php?village=0&screen=info_ally&id=${this.ally.id}`;
						this.ally.link_guest = `https://${options.server}${market.link}/guest.php?screen=info_ally&id=${this.ally.id}`;
					}
					this.conquer = get_conquer_data(this);
				}
			}
		}
		await owner._set_owner();
		if (!owner.player) {
			interaction ? interaction.editReply({ content: `${translation[`${options.type}_error`]}`, ephemeral: true }) : null;
			return;
		}
		const embed_fields = {
			title: [
				`**${owner.name}** | `,
				`${options.server.toUpperCase()}`
			].join(""),
			description: {
				link: [
					`**${translation["link"]}:** `,
					`[${translation["ingame"]}](${owner.link}) `,
					`[${translation["guest"]}](${owner.link_guest}) `,
					`[${translation["twstat"]}](${owner.link_twstat}) `,
				].join(""),
				ally: [
					`**${translation["ally"]}:** `,
					owner.ally.joined ?
						[
							`[${owner.ally.tag}](${owner.ally.link}) `,
							`(${format_number(owner.ally.points)}p.)`
						].join("")
						: `${translation["ally_not_joined"]}`
				].join(""),
				player: [
					`**${translation["rank"]}:** ${format_number(owner.rank)}`,
					`**${translation["points"]}:** ${format_number(owner.points)}`,
					`**${translation["villages"]}:** ${format_number(owner.villages)}`,
				].join("\n"),
				conquers: [
					`**${translation["conquers"]}:**`,
					[
						`${translation["gain"]}: ${format_number(owner.conquer.gain)}`,
						`${translation["barb"]}: ${format_number(owner.conquer.barb)}`,
						`${translation["lose"]}: ${format_number(owner.conquer.lose)}`
					].join("‎ ‎ ‎ ‎ ‎ ‎"),
					[
						`${translation["self"]}: ${format_number(owner.conquer.self)}`,
						`${translation["sum"]}: ${format_number(owner.conquer.sum)}`,
					].join("‎ ‎ ‎ ‎ ‎ ‎")
				].join("\n"),
				kills: [
					`**${translation["kills_text"]}:**`,
					[
						`**${translation["oda"]}:** `,
						[
							`${translation["rank"]}: ${format_number(owner.kill_att.rank)}`,
							`${translation["kills"]}: ${format_number(owner.kill_att.kills)}`,
						].join("‎ ‎ ‎ ‎ ‎ ‎")
					].join(""),
					[
						`**${translation["odd"]}:** `,
						[
							`${translation["rank"]}: ${format_number(owner.kill_def.rank)}`,
							`${translation["kills"]}: ${format_number(owner.kill_def.kills)}`,
						].join("‎ ‎ ‎ ‎ ‎ ‎")
					].join(""),
					[
						`**${translation["ods"]}:** `,
						[
							`${translation["rank"]}: ${format_number(owner.kill_sup.rank)}`,
							`${translation["kills"]}: ${format_number(owner.kill_sup.kills)}`,
						].join("‎ ‎ ‎ ‎ ‎ ‎")
					].join(""),
					[
						`**${translation["od"]}:** ‎ ‎ ‎ `,
						[
							`${translation["rank"]}: ${format_number(owner.kill_all.rank)}`,
							`${translation["kills"]}: ${format_number(owner.kill_all.kills)}`,
						].join("‎ ‎ ‎ ‎ ‎ ‎")
					].join(""),
				].join("\n")
			},
			thumbnail_url: owner.image,
			_generate_description() {
				return [
					this.description.link,
					this.description.ally,
					``,
					this.description.player,
					``,
					this.description.conquers,
					``,
					this.description.kills
				].join("\n");
			}
		};
		const embed = new EmbedBuilder();
		embed.setTitle(embed_fields.title);
		embed_fields.thumbnail_url ? embed.setThumbnail(embed_fields.thumbnail_url) : null;
		embed.setDescription(embed_fields._generate_description());
		interaction.editReply({ embeds: [embed] })
	}
	async function show_ally() {
		const ally = {
			players: {},
			conquers: {
				gain: 0,
				barb: 0,
				lose: 0,
				internal: 0,
				sum: 0
			},
			_set_ally: async function () {
				this.id = options.ally;
				this.data = get_tribal_data("ally", this.id)?.split(",");
				if (!this.data) { return; }
				this.tag = decodeURIComponent(this.data[indexes.map_ally.indexOf("tag")].replaceAll("+", " "));
				this.name = decodeURIComponent(this.data[indexes.map_ally.indexOf("name")].replaceAll("+", " "));
				this.members = this.data[indexes.map_ally.indexOf("members")];
				this.villages = this.data[indexes.map_ally.indexOf("villages")];
				this.rank = this.data[indexes.map_ally.indexOf("rank")];
				this.points = this.data[indexes.map_ally.indexOf("points")];
				this.all_points = this.data[indexes.map_ally.indexOf("all_points")];
				this.kill_att = get_kill_data("kill_att_tribe", this.id);
				this.kill_def = get_kill_data("kill_def_tribe", this.id);
				this.kill_all = get_kill_data("kill_all_tribe", this.id);
				this.link = `https://${options.server}${market.link}/game.php?village=0&screen=info_ally&id=${this.id}`;
				this.link_guest = `https://${options.server}${market.link}/guest.php?screen=info_ally&id=${this.id}`;
				this.link_twstat = `${market.twstat}${options.server}/index.php?page=tribe&id=${this.id}`;
				this.image = await get_user_image(this.link_guest);
			},
			_set_ally_players: function () {
				const players = botSettings.cache[`map_player`][options.server].filter(player => player.split(",")[indexes[`map_player`].indexOf("ally")] === this.id);
				for (let player_data of players) {
					player_data = player_data.split(",");
					const player_id = player_data[indexes.map_player.indexOf("id")];
					this.players[player_id] = {
						name: decodeURIComponent(player_data[indexes.map_player.indexOf("name")].replaceAll("+", " ")),
						points: player_data[indexes.map_player.indexOf("points")],
						villages: player_data[indexes.map_player.indexOf("villages")],
						rank: player_data[indexes.map_player.indexOf("rank")],
						link: `https://${options.server}${market.link}/game.php?village=0&screen=info_player&id=${player_id}`,
						link_guest: `https://${options.server}${market.link}/guest.php?screen=info_player&id=${player_id}`,
						link_twstat: `${market.twstat}${options.server}/index.php?page=player&id=${player_id}`
					};
				}
			},
			_set_ally_conquers: function () {
				const conquers = botSettings.cache["map_conquer"][options.server];
				const ally_players = Object.keys(this.players);
				conquers.forEach(conquer => {
					const new_owner = conquer.split(",")[indexes.conquer.indexOf("new_owner")];
					const old_owner = conquer.split(",")[indexes.conquer.indexOf("old_owner")];
					if (ally_players.includes(new_owner)) {
						if (old_owner === "0") { this.conquers.barb++; }
						else if (new_owner === old_owner) { }
						else if (ally_players.includes(old_owner)) { this.conquers.internal++; }
						else { this.conquers.gain++; }
					}
					else if (ally_players.includes(old_owner)) {
						this.conquers.lose++;
					}
					else { }
				});
				this.conquers.sum = this.conquers.gain + this.conquers.barb;
			},
			init: async function () {
				await this._set_ally();
				if (!this.data) { return; }
				this._set_ally_players();
				this._set_ally_conquers();
			}
		};
		await ally.init();
		if (!ally.data) {
			interaction ? interaction.editReply({ content: `${translation[`${options.type}_error`]}`, ephemeral: true }) : null;
			return;
		}
		const embed_fields = {
			title: [
				`**${ally.tag}** | `,
				`${options.server.toUpperCase()}`
			].join(""),
			description: {
				link: [
					`**${translation["link"]}:** `,
					`[${translation["ingame"]}](${ally.link}) `,
					`[${translation["guest"]}](${ally.link_guest}) `,
					`[${translation["twstat"]}](${ally.link_twstat}) `,
				].join(""),
				ally: [
					`**${ally.name}**`,
					`**${translation["rank"]}:** ${format_number(ally.rank)}`,
					`**${translation["points"]}:** ${format_number(ally.all_points)}`,
					`**${translation["villages"]}:** ${format_number(ally.villages)}`,
					`**${translation["members"]}:** ${format_number(ally.members)}`,
					`${Object.values(ally.players).map(player => player.name).join(';')}`
				].join("\n"),
				conquers: [
					`**${translation["conquers"]}:**`,
					[
						`${translation["gain"]}: ${format_number(ally.conquers.gain)}`,
						`${translation["barb"]}: ${format_number(ally.conquers.barb)}`,
						`${translation["lose"]}: ${format_number(ally.conquers.lose)}`
					].join("‎ ‎ ‎ ‎ ‎ ‎"),
					[
						`${translation["internal"]}: ${format_number(ally.conquers.internal)}`,
						`${translation["sum"]}: ${format_number(ally.conquers.sum)}`,
					].join("‎ ‎ ‎ ‎ ‎ ‎")
				].join("\n"),
				kills: [
					`**${translation["kills_text"]}:**`,
					[
						`**${translation["oda"]}:** `,
						[
							`${translation["rank"]}: ${format_number(ally.kill_att.rank)}`,
							`${translation["kills"]}: ${format_number(ally.kill_att.kills)}`,
						].join("‎ ‎ ‎ ‎ ‎ ‎")
					].join(""),
					[
						`**${translation["odd"]}:** `,
						[
							`${translation["rank"]}: ${format_number(ally.kill_def.rank)}`,
							`${translation["kills"]}: ${format_number(ally.kill_def.kills)}`,
						].join("‎ ‎ ‎ ‎ ‎ ‎")
					].join(""),
					[
						`**${translation["od"]}:** ‎ ‎ ‎ `,
						[
							`${translation["rank"]}: ${format_number(ally.kill_all.rank)}`,
							`${translation["kills"]}: ${format_number(ally.kill_all.kills)}`,
						].join("‎ ‎ ‎ ‎ ‎ ‎")
					].join(""),
				].join("\n")
			},
			thumbnail_url: ally.image,
			_generate_description() {
				return [
					this.description.link,
					``,
					this.description.ally,
					``,
					this.description.conquers,
					``,
					this.description.kills
				].join("\n");
			}
		};
		const embed = new EmbedBuilder();
		embed.setTitle(embed_fields.title);
		embed_fields.thumbnail_url ? embed.setThumbnail(embed_fields.thumbnail_url) : null;
		embed.setDescription(embed_fields._generate_description());
		interaction.editReply({ embeds: [embed] })
	}
	function get_tribal_data(type, id, id_type = "id") {
		switch (type) {
			case "village":
				return botSettings.cache[`map_${type}`][options.server].find(data => {
					const data_split = data.split(",");
					const x = data_split[indexes[`map_${type}`].indexOf("x")];
					const y = data_split[indexes[`map_${type}`].indexOf("y")];
					if (id[0].match(x) && id[1].match(y)) {
						return data;
					}
				});
			default:
				const index_type = type.startsWith("kill") ? `kill` : `map_${type}`
				return botSettings.cache[`map_${type}`][options.server].find(data => {
					return data.split(",")[indexes[index_type].indexOf(id_type)] === id;
				});
		}
	}
	function get_kill_data(type, id) {
		const kill_data = get_tribal_data(type, id)?.split(",");
		return kill_data ? {
			rank: kill_data[indexes.kill.indexOf("rank")],
			kills: +kill_data[indexes.kill.indexOf("kills")]
		}
			: { rank: "0", kills: 0 };
	}
	function get_conquer_data(player) {
		const conquers = botSettings.cache["map_conquer"][options.server];
		const player_conquers = {
			gain: 0,
			barb: 0,
			self: 0,
			lose: 0,
			sum: 0
		};
		conquers.forEach(conquer => {
			const new_owner = conquer.split(",")[indexes.conquer.indexOf("new_owner")];
			const old_owner = conquer.split(",")[indexes.conquer.indexOf("old_owner")];
			if (new_owner === player.id) {
				if (old_owner === "0") { player_conquers.barb++; }
				else if (old_owner === new_owner) { player_conquers.self++; }
				else { player_conquers.gain++; }
			}
			else if (old_owner === player.id) {
				player_conquers.lose++;
			}
			else { }
		});
		player_conquers.sum = player_conquers.gain + player_conquers.barb;
		return player_conquers;
	}
	function get_continent_number(village) {
		const x = village[indexes.map_village.indexOf("x")];
		const y = village[indexes.map_village.indexOf("y")];
		return `k${y.length > 2 ? y.charAt(0) : 0}${x.length > 2 ? x.charAt(0) : 0}`;
	}
	async function get_user_image(link) {
		const url = await axios.get(link);
		const img = url.data?.split('<img src="')?.find(img => img.includes("userimage") && img.includes("large"))?.split('"')[0];
		return img;
	}
	function format_number(num) {
		return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	}
}
async function setup_base_cronjobs() {
	const base_cronjobs = [
		{
			time: "59 */1 * * *",
			type: "update_config"
		},
		{
			time: "0 */1 * * *",
			type: "update_cached_data"
		},
		{
			time: "55 */1 * * *",
			type: "update_map_data"
		},
		{
			time: "12 */1 * * *",
			type: "update_daily_stats"
		},
		{
			time: "0 0 * * *",
			type: "update_live_servers"
		},
		{
			time: "* * * * *",
			type: "ennoblements"
		},
		{
			time: "*/15 * * * *",
			type: "speed_table"
		}
	];
	const errors = [];
	for await (let cronjob of base_cronjobs) {
		let add_base_cronjob = await mongodb.ADD_CRONJOB_TO_BASE_CONFIG(cronjob);
		if (!add_base_cronjob?.status) {
			errors.push(cronjob?.type);
		}
	}
	return {
		status: errors.length ? false : true,
	};
}
async function register_base_cronjobs() {
	if (botSettings.base_config.basic_cronjobs.length < 1) {
		let setup_cronjobs = await setup_base_cronjobs();
		if (setup_cronjobs) {
			await update_config();
			register_base_cronjobs();
		}
		else { console.log("Failed to register base cronjobs"); }
	}
	for (job of botSettings.base_config.basic_cronjobs) {
		cron_jobs(job.type, job);
	}
}
async function register_guild_cronjobs() {
	const guilds_with_cronjobs = botSettings.guilds_config.filter(guild => guild.config.cronjobs.length > 0);
	for (let guild of guilds_with_cronjobs) {
		for (let cronjob of guild.config.cronjobs) {
			cron_jobs(cronjob.type, cronjob);
		}
	}
}
async function cron_jobs(type, data) {
	/*
	- Seconds: 0-59
	- Minutes: 0-59
	- Hours: 0-23
	- Day of Month: 1-31
	- Months: 0-11 (Jan-Dec)
	- Day of Week: 0-6 (Sun-Sat)
  */
	const cron_type = Object.keys(botSettings.base_config.cron_type).find(group => botSettings.base_config.cron_type[group].includes(type));
	async function cron_get_type(scope, index, cron_type, type, data) {
		switch (cron_type) {
			case "basic":
				switch (type) {
					case "update_config":
						update_config();
						break;
					case "update_cached_data":
						update_cached_data();
						break;
					case "update_map_data":
						download_map_data();
						break;
					case "update_daily_stats":
						download_daily_stats();
						break;
					case "update_live_servers":
						update_live_servers();
						break;
					case "ennoblements":
						live_ennoblements();
						break;
					case "speed_table":
						speed_table();
						break;
				}
				break;
			case "guild":
				switch (type) {
					case "map":
						get_generated_map(false, data);
						break;
					case "message":
						send_message(data);
						break;
					case "stat":
						generate_tribe_chart(false, data);
						break;
				}
				break;
			case "control":
				let cron_to_control, cron_to_control_index;
				switch (type) {
					case "start":
						switch (scope) {
							case "basic":
								if (botSettings.cronjobs.basic_cronjobs[data.cron_id].running) { }
								else {
									botSettings.cronjobs.basic_cronjobs[data.cron_id].start();
									cron_to_control = botSettings.base_config.basic_cronjobs.find(cron => cron.cron_id === data.cron_id);
									cron_to_control.play = true;
									mongodb.UPDATE_BASE_CONFIG("basic_cronjobs", botSettings.base_config.basic_cronjobs);
								}
								break;
							case "guild":
								if (botSettings.cronjobs.guild_cronjobs[data.cron_id].running) { }
								else {
									botSettings.cronjobs.guild_cronjobs[data.cron_id].start();
									mongodb.UPDATE_GUILD_CONFIG("cronjobs", data, type);
								}
								break;
						}
						break;
					case "stop":
						switch (scope) {
							case "basic":
								if (botSettings.cronjobs.basic_cronjobs[data.cron_id].running) {
									botSettings.cronjobs.basic_cronjobs[data.cron_id].stop();
									cron_to_control = botSettings.base_config.basic_cronjobs.find(cron => cron.cron_id === data.cron_id);
									cron_to_control.play = false;
									mongodb.UPDATE_BASE_CONFIG("basic_cronjobs", botSettings.base_config.basic_cronjobs);
								}
								else { }
								break;
							case "guild":
								if (botSettings.cronjobs.guild_cronjobs[data.cron_id].running) {
									botSettings.cronjobs.guild_cronjobs[data.cron_id].stop();
									mongodb.UPDATE_GUILD_CONFIG("cronjobs", data, type);
								}
								else { }
								break;
						}
						break;
					case "delete":
						switch (scope) {
							case "basic":
								if (botSettings.cronjobs.basic_cronjobs[data.cron_id].running) {
									botSettings.cronjobs.basic_cronjobs[data.cron_id].stop();
								}
								delete botSettings.cronjobs.basic_cronjobs[data.cron_id];
								cron_to_control_index = botSettings.base_config.basic_cronjobs.map(job => job.cron_id === data.cron_id).indexOf(true);
								botSettings.base_config.basic_cronjobs.splice(cron_to_control_index, 1);
								mongodb.UPDATE_BASE_CONFIG("basic_cronjobs", botSettings.base_config.basic_cronjobs);
								break;
							case "guild":
								if (botSettings.cronjobs.guild_cronjobs[data.cron_id]?.running) {
									botSettings.cronjobs.guild_cronjobs[data.cron_id].stop();
								}
								index ? delete botSettings.cronjobs.guild_cronjobs[data.cron_id] : null;
								botSettings.guilds_config.filter(guild => {
									guild.config.cronjobs = guild.config.cronjobs.filter(cron => cron.cron_id !== data.cron_id);
									return guild;
								});
								await mongodb.UPDATE_GUILD_CONFIG("cronjobs", data, type);
								break;
						}
						break;
					case "modify":
						switch (scope) {
							case "basic":
								if (botSettings.cronjobs.basic_cronjobs[data.cron_id].running) {
									botSettings.cronjobs.basic_cronjobs[data.cron_id].stop();
								}
								delete botSettings.cronjobs.basic_cronjobs[data.cron_id];
								cron_to_control_index = botSettings.base_config.basic_cronjobs.map(job => job.cron_id === data.cron_id).indexOf(true);
								cron_to_control = botSettings.base_config.basic_cronjobs[cron_to_control_index];
								data.time.length ? cron_to_control.time = data.time : false;
								data.type.length ? cron_to_control.type = data.type : false;
								data.message.length ? cron_to_control.message = data.message : false;
								data.channel_id.length ? cron_to_control.channel_id = data.channel_id : false;
								data.onetime.length ? cron_to_control.onetime = data.onetime : false;
								data.play.length ? cron_to_control.play = data.play : false;
								mongodb.UPDATE_BASE_CONFIG("basic_cronjobs", botSettings.base_config.basic_cronjobs);
								cron_jobs(cron_to_control.type, cron_to_control);
								break;
							case "guild":
								if (botSettings.cronjobs.guild_cronjobs[data.cron_id]?.running) {
									botSettings.cronjobs.guild_cronjobs[data.cron_id].stop();
								}
								index ? delete botSettings.cronjobs.guild_cronjobs[data.cron_id] : null;
								cron_to_control = await mongodb.UPDATE_GUILD_CONFIG("cronjobs", data, type);
								if (botSettings.base_config.cron_type.guild.includes(cron_to_control.type)) {
									cron_jobs(cron_to_control.type, cron_to_control);
								}
								break;
						}
						break;
					case "create":
						switch (scope) {
							case "basic":
								cron_to_control = await mongodb.ADD_CRONJOB_TO_BASE_CONFIG(data);
								update_config();
								cron_jobs(cron_to_control.type, cron_to_control);
								break;
							case "guild":
								cron_to_control = await mongodb.UPDATE_GUILD_CONFIG("cronjobs", data, type);
								update_config();
								if (botSettings.base_config.cron_type.guild.includes(cron_to_control.type)) {
									cron_jobs(cron_to_control.type, cron_to_control);
								}
								break;
						}
						break;
				}
				break;
		}
	}

	if (cron_type === "basic") {
		botSettings.cronjobs.basic_cronjobs[data.cron_id] = new CronJob(data.time, function () {
			const cron_date = new Date();
			console.log(`Basic Cronjob ${data.cron_id} type: ${data.type} ${data.message}  start: ${cron_date}`);
			cron_get_type("", "", cron_type, type, data);
		});
		if (data.play) { botSettings.cronjobs.basic_cronjobs[data.cron_id].start(); }
		if (data.onetime) { botSettings.cronjobs.basic_cronjobs[data.cron_id].stop(); }
	}
	else if (cron_type === "guild") {
		botSettings.cronjobs.guild_cronjobs[data.cron_id] = new CronJob(data.time, function () {
			const cron_date = new Date();
			console.log(`Guild Cronjob ${data.cron_id} type: ${data.type} ${data.message}  start: ${cron_date}`);
			cron_get_type("", "", cron_type, type, data);
		});
		if (data.play) { botSettings.cronjobs.guild_cronjobs[data.cron_id].start(); }
		if (data.onetime) { botSettings.cronjobs.guild_cronjobs[data.cron_id].stop(); }
	}
	else if (cron_type === "control") {
		const is_basic = Object.keys(botSettings.cronjobs.basic_cronjobs).find(job => job === data.cron_id) ? true : false;
		const is_guild = Object.keys(botSettings.cronjobs.guild_cronjobs).find(job => job === data.cron_id) ? true : false;
		if (!is_basic && !is_guild) {
			switch (type) {
				case "create":
					await cron_get_type(data.scope, false, cron_type, type, data);
					break;
				case "delete":
					await cron_get_type(data.scope, false, cron_type, type, data);
					break;
				case "modify":
					await cron_get_type(data.scope, false, cron_type, type, data);
					break;
			}
		}
		if (is_basic) {
			cron_get_type("basic", is_basic, cron_type, type, data);
		}
		else if (is_guild) {
			cron_get_type("guild", is_guild, cron_type, type, data);
		}
		else { }
	}
	else { }
}
async function add_reactions_to_roles() {
	return;
	for (let a = 0; a < botOptions.roles.length; a++) {
		const msg = await discordClient.channels.cache.get(botOptions.roles[a].channel_id).messages.fetch(botOptions.roles[a].message_id);
		for (let i = 0; i < botOptions.roles[a].roles.length; i++) {
			await msg.react(botOptions.roles[a].roles[i].emoji_id);
		}
	}
}
async function normal_commands() {
}
async function slash_commands() {
	const dev_commands = ["bot_control", "bot_presence"];
	const slash_commands = [];
	const dev_slash_commands = [];
	const commandFiles = fs.readdirSync(`${require.main.path}/commands`).filter(file => file.endsWith('.js'));
	for (let file of commandFiles) {
		let command = require(`./commands/${file}`);
		registerCommands(command);
		if (DEV) {
			slash_commands.push(command.data.toJSON());
		}
		else {
			if (dev_commands.includes(command.data.name)) {
				dev_slash_commands.push(command.data.toJSON());
			}
			else {
				slash_commands.push(command.data.toJSON());
			}
		}
	}
	deployCommands();
	async function registerCommands(command) {
		if ('data' in command && 'execute' in command) {
			discordClient.commands.set(command.data.name, command);
		}
	}
	async function deployCommands() {
		try {
			console.log(`Started refreshing application (/) commands.`);
			let data;
			if (DEV) {
				data = await rest.put(
					Routes.applicationGuildCommands(BOT_CLIENT_ID, BOT_GUILD_ID),
					{ body: slash_commands }
				);
			}
			else {
				data = await rest.put(
					Routes.applicationCommands(BOT_CLIENT_ID),
					{ body: slash_commands }
				);
				await rest.put(
					Routes.applicationGuildCommands(BOT_CLIENT_ID, process.env.DISCORDJS_DEV_GUILD_ID),
					{ body: dev_slash_commands }
				)
			}
			console.log(`Successfully reloaded ${data.length} application commands and ${dev_slash_commands.length} dev commands.`);
		}
		catch (error) {
			console.error(error);
		}
	}
}
async function ai_chatting(locale, message, args) {
	async function pbot(text, user_name, bot_name) {
		const now = Date.now();
		function crc(string) {
			function get_num_array() {
				var num;
				var num_array = [];
				for (var i = 0; i < 256; i++) {
					num = i;
					for (var j = 0; j < 8; j++) {
						num = num & 1 ? 3988292384 ^ num >>> 1 : num >>> 1;
					}
					num_array[i] = num;
				}
				return num_array;
			};
			var num_array = get_num_array();
			var num = -1;
			for (var i = 0; i < string["length"]; i++) {
				num = num >>> 0x8 ^ num_array[(num ^ string["charCodeAt"](i)) & 255];
			}
			return (num ^ -1) >>> 0;
		};
		function getCRCSign(date_now) {
			return crc("public-api" + date_now + "qVxRWnespIsJg7DxFbF6N9FiQR5cjnHy" + "ygru3JcToH4dPdiN" + "H5SXOYIc00qMXPKJ");
		};
		const payload = [
			`request=${encodeURIComponent(text)}`,
			`request_1=`,
			`answer_1=`,
			`request_2=`,
			`answer_2=`,
			`request_3=`,
			`answer_3=`,
			`bot_name=${bot_name ? encodeURIComponent(bot_name) : "%CF%81Bot"}`,
			`user_name=${user_name ? encodeURIComponent(user_name) : "Newcomer"}`,
			`dialog_lang=en`,
			`dialog_id=9d425e6c-54cf-4bde-ab49-e38a3cd20771`,
			`dialog_greeting=false`,
			`a=public-api`,
			`b=${crc(now + "b")}`,
			`c=${getCRCSign(now)}`,
			`d=${crc(Date.now() + "d")}`,
			`e=${Math.random()}`,
			`t=${now}`,
			`x=${Math.random() * 10}`
		];
		const options = {
			method: 'post',
			url: "http://p-bot.ru/api/getAnswer",
			headers: {
				'Accept': '*/*',
				'Accept-Encoding': 'gzip, deflate',
				'Content-Type': 'application/x-www-form-urlencoded',
				'Host': 'p-bot.ru',
				'Origin': 'http://p-bot.ru',
				'Referer': 'http://p-bot.ru/en/',
			},
			data: payload.join('&'),
		};
		const response = await axios(options);
		const result = await response.data;
		const answer = {
			answer: result.answer ?? undefined,
			context: result.pattern.context ?? undefined,
			request: result.pattern.request ?? undefined
		};
		const ignore_answers = ["no answer", "<a>"];
		if (!ignore_answers.some(word => answer.answer.includes(word))) {
			if (answer.answer && answer.answer.length > 1) { return answer.answer }
		}
		if (answer.request && answer.request.length > 1) { return answer.request }
		if (answer.context && answer.context.length > 1) { return answer.context }
	}
	async function chai(message) {
		const promise = new Promise((resolve) => {
			const post_options = {
				hostname: 'model-api-shdxwd54ta-nw.a.run.app',
				path: '/generate/gptj',
				method: 'POST',
				headers: {
					authority: 'model-api-shdxwd54ta-nw.a.run.app',
					developer_key: 'sLdHjVjwMKd_7pd4C4l8S8yugfqq8caILaez7KJAmtKrZErnAOIVx_RoyOF6xRcAMvQ_yqlkxEWi87X0FIoaOg',
					developer_uid: 'mUCsg14rQqYbpRkcqMbiPKa29xg1',
					origin: 'https://chai.ml',
					referer: 'https://chai.ml',
					//'content-type': 'application/json'
				}
			}
			const post_data = {
				repetition_penalty: 1.1,
				response_length: 64,
				temperature: 1,
				text: `${message}`,
				top_k: 1,
				top_p: 1
			};
			const post_req = https.request(post_options, function (res) {
				res.setEncoding('utf8');
				let ai_messaging_result = "";
				res.on('data', function (chunk) {
					ai_messaging_result = ai_messaging_result + chunk;
					resolve(JSON.parse(ai_messaging_result).data);
				});
			});
			post_req.write(JSON.stringify(post_data));
			post_req.end();
		});
		const wait_for_promise = await promise;
		return wait_for_promise;
	}
	async function translate(source_lang, target_lang, text) {
		if (source_lang === "en" && target_lang === "en") { return text; }
		let translated_text = "";
		const response = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source_lang}&tl=${target_lang}&dt=t&q=${encodeURI(text)}`);
		for (let i = 0; i < response.data[0].length; i++) {
			translated_text = translated_text + (response.data[0][i][0] + "\n");
		}
		return translated_text;
	}
	if (!message.content || message.embeds.length) { return; }
	if (message.content.includes("https://")) { return; }
	if (message.content.toLowerCase().startsWith("hoo") && message.content.length > 5) { message.content = message.content.substring(4, message.content.length) }
	const translate_text_en = await translate(locale, "en", message.content);
	const ai_messaging_text = await pbot(`${translate_text_en}`, message.author.username, "DonGábor");
	if (ai_messaging_text === undefined) { return; }
	const back_translated_text = await translate("en", locale, ai_messaging_text);
	if (!back_translated_text.substring(0, 1).match(/[:@[]/g)) { message.channel.send(back_translated_text); }
}
async function bot_activity_change(name, type, status) {
	const list = botSettings.base_config.bot_activity;
	discordClient.user.setPresence({
		activities: [{
			name: name ? `${name}` : `${list.name[Math.floor(Math.random() * list.name.length)]}`,
			type: type ? ActivityType[`${type}`] : ActivityType[Math.floor(Math.random() * Object.keys(ActivityType).length)]
		}],
		status: status ? `${status}` : list.status[Math.floor(Math.random() * list.status.length)]
	});
	const random_change_time = (Math.random() * 50 + 10) * 60 * 1000;
	if (name === undefined) {
		setTimeout(bot_activity_change, random_change_time);
	}
}

async function bot_control(interaction) {
	const user = `${interaction.user.username}`;
	const options = {
		command: interaction.options.getSubcommand(),
		file: interaction.options._hoistedOptions?.find(option => ["package", "code"].includes(option.name))?.attachment?.attachment,
		sure: interaction.options.getBoolean("sure"),
	};
	if (user !== process.env.DISCORD_BOT_ADMIN) {
		interaction.editReply({ content: 'You are not authorized to do that!', ephemeral: true });
		return;
	}
	if (!["shutdown", "restart", "update", "script"].includes(options.command)) {
		interaction.editReply({ content: 'Wrong command!', ephemeral: true });
		return;
	}
	if (!options.file && !["shutdown", "restart"].includes(options.command)) {
		interaction.editReply({ content: 'You did not provided a file!', ephemeral: true });
		return;
	}
	if (!options.sure) {
		interaction.editReply({ content: 'You are not sure!', ephemeral: true });
		return;
	}
	switch (options.command) {
		case "shutdown":
			shutdown(options);
			break;
		case "restart":
			restart(options);
			break;
		case "update":
			update(options);
			break;
		case "script":
			script(options);
			break;
	}
	async function shutdown(options) {
		await interaction.editReply({ content: 'Shutting down application...!', ephemeral: true });
		process.exit();
	}
	async function restart(options) {
		await interaction.editReply({ content: 'Restarting application...!', ephemeral: true });
		const nodeArgs = process.argv.slice(1);
		const new_child_process = child_process.spawn(process.argv[0], nodeArgs, {
			cwd: process.cwd(),
			detached: true,
			stdio: 'inherit'
		});
		await interaction.editReply({ content: 'Child process created...!', ephemeral: true });
		await helper.sleep(5000);
		new_child_process.unref();
		await interaction.editReply({ content: 'Shutting down, application restarted...!', ephemeral: true });
		process.exit();
	}
	async function update(options) {
		await interaction.editReply({ content: "Downloading update....", ephemeral: true });
		try {
			const response = await axios.get(options.file, { responseType: "arraybuffer" });
			const buffer = Buffer.from(response.data, "binary");
			await interaction.editReply({ content: "Applying update...", ephemeral: true });
			await decompress(buffer, require.main.path);
			await interaction.editReply({ content: "Update applyed sucessfully....", ephemeral: true });
			restart();
		}
		catch (error) {
			await interaction.editReply({ content: `Error: ${error.toString()}`, ephemeral: true });
		}
	}
	async function script(options) {
		await interaction.editReply({ content: "Getting the script", ephemeral: true });
		const file = await axios.get(options.file);
		const script = file.data;
		const node = child_process.spawn('node', ['-e', script]);
		node.stdout.on("data", data => {
			interaction.editReply({ content: data.toString(), ephemeral: true });
		});
	}
}
async function log_error(error, parameters) {
	const ticket = await mongodb.ERROR_HANDLING(error, parameters);
	if (!ticket) { return; }
	const embed = new EmbedBuilder();
	embed.setAuthor({
		"name": `${ticket.id}`
	});
	embed.setDescription(ticket.hash);
	if (parameters) {
		embed.addFields({
			name: `Parameters`,
			value: Object.keys(parameters)
				.map(key => `${key}: ${parameters[key]}`)
				.join("\n")
		});
	}
	embed.setTimestamp();
	discordClient.channels.cache.get(botSettings.base_config.dev_channels.prod_errors).send({ embeds: [embed] });
}
async function message_delete(channel_id, message_id) {
	discordClient.channels.fetch(channel_id).then(channel => {
		channel.messages.delete(message_id);
	});
}
async function message_create(channel_id, message) {
	discordClient.channels.cache.get(channel_id).send(message);
}
async function channel_permission_overwrite(channel_id, options) {
	discordClient.channels.fetch(channel_id).then(channel => {
		channel.permissionOverwrites.create(channel.guild.roles.everyone, {
			'SendMessages': false,
			'EmbedLinks': null,
			'AttachFiles': false,
		})
	});
}
async function swear_words_punishment(message) {
	const guild = botSettings.guilds_config.find(guild => guild.guild_id === message.guildId);
	if (!guild) { return; }
	const use_locale = guild.market ?? "en";
	const config = guild.config.swear_words_punishment;
	if (!guild.active) return;
	if (guild.ban) return;
	if (!config.enabled) return;
	if (Object.keys(config.black_list).includes(message.author.id)) return;
	if (config.use_global_preset) {
		config.words = botSettings.base_config.swear_words.words;
		config.ai_bot_chat = botSettings.base_config.swear_words.ai_bot_chat;
		config.react_emojis = botSettings.base_config.swear_words.react_emojis;
	}
	const option_to_use = get_option_to_use();
	switch (option_to_use) {
		case "ai_bot_chat":
			ai_chatting(use_locale, message, message.content);
			break;
		case "react_emojis":
			if (!config.react_emojis.emojis.length) {
				config.react_emojis.emojis = botSettings.base_config.react_emojis.emojis;
			}
			try {
				message.react(config.react_emojis.emojis[Math.floor(Math.random() * config.react_emojis.emojis.length)]);
			} catch (error) { }
			break;
		default:
			break;
	}
	function get_option_to_use() {
		const usable_options = [];
		const luck = Math.ceil(Math.random() * 100);
		if (Object.keys(config.ai_bot_chat.force_list).includes(message.author.id)) { return "ai_bot_chat"; }
		if (Object.keys(config.react_emojis.force_list).includes(message.author.id)) { return "react_emojis"; }
		if (!config.words.some(word => message.content.toLowerCase().includes(word.toLowerCase()))) { return false; }
		if (Object.keys(config.white_list).includes(message.author.id)) { usable_options.push("ai_bot_chat", "react_emojis"); }
		if (config.ai_bot_chat.use) {
			if (Object.keys(config.ai_bot_chat.black_list).includes(message.author.id)) { }
			else if (Object.keys(config.ai_bot_chat.white_list).includes(message.author.id)) { usable_options.push("ai_bot_chat"); }
			else if (config.ai_bot_chat.percentage >= luck) { usable_options.push("ai_bot_chat"); }
		}
		if (config.react_emojis.use) {
			if (Object.keys(config.ai_bot_chat.black_list).includes(message.author.id)) { }
			else if (Object.keys(config.react_emojis.white_list).includes(message.author.id)) { usable_options.push("react_emojis"); }
			else if (config.react_emojis.percentage >= luck) { usable_options.push("react_emojis"); }
		}
		return usable_options.length ? usable_options[Math.floor(Math.random() * usable_options.length)] : false;
	}
}
async function set_swear_words(interaction) {
	const use_locale = helper.translation_locale("swear_words", interaction.locale);
	const translation = botSettings.base_config.translations.swear_words[use_locale];
	const options = {
		guild: interaction.guild.id,
		guild_name: interaction.guild.name,
		market: use_locale,
		command: interaction.options.getSubcommand()
	};
	let additional_options, data, words, no_option_given;
	const guild_swear_words = botSettings.guilds_config.find(guild => guild.guild_id === interaction.guild.id).config.swear_words_punishment;
	switch (options.command) {
		case "modify":
			additional_options = {
				enable: interaction.options.getBoolean("enable") ?? undefined,
				use_default: interaction.options.getBoolean("use_default") ?? undefined,
				use_ai_chat: interaction.options.getBoolean("use_ai_chat") ?? undefined,
				use_react_emoji: interaction.options.getBoolean("use_react_emoji") ?? undefined,
				add_words: interaction.options.getString("add_words") ?? undefined,
				delete_words: interaction.options.getString("delete_words") ?? undefined,
				add_emoji: interaction.options.getString("add_emoji") ?? undefined,
				delete_emoji: interaction.options.getString("delete_emoji") ?? undefined,
				ai_chat_ratio: interaction.options.getNumber("ai_chat_ratio") ?? undefined,
				react_emoji_ratio: interaction.options.getNumber("react_emoji_ratio") ?? undefined
			};
			no_option_given = [...new Set(Object.values(additional_options))].every(option => option === undefined);
			if (no_option_given) {
				interaction.editReply({ content: `${translation["no_option_given"]}`, ephemeral: true });
				return;
			}
			if (typeof (additional_options.enable) !== "undefined") { guild_swear_words.enabled = additional_options.enable; }
			if (typeof (additional_options.use_default) !== "undefined") { guild_swear_words.use_global_preset = additional_options.use_default; }
			if (typeof (additional_options.use_ai_chat) !== "undefined") { guild_swear_words.ai_bot_chat.use = additional_options.use_ai_chat; }
			if (typeof (additional_options.use_react_emoji) !== "undefined") { guild_swear_words.react_emojis.use = additional_options.use_react_emoji; }
			if (typeof (additional_options.add_words) !== "undefined") {
				guild_swear_words.words = [...new Set(guild_swear_words.words.concat(additional_options.add_words.split(",")))];
			}
			if (typeof (additional_options.delete_words) !== "undefined") {
				words = additional_options.delete_words.split(",");
				guild_swear_words.words = guild_swear_words.words.filter(word => !words.includes(word));
			}
			if (typeof (additional_options.add_emoji) !== "undefined") {
				guild_swear_words.react_emojis.emojis = [...new Set(guild_swear_words.react_emojis.emojis.concat(additional_options.add_emoji.replaceAll(" ", "").split(",")))];
			}
			if (typeof (additional_options.delete_emoji) !== "undefined") {
				words = additional_options.delete_emoji.replaceAll(" ", "").split(",");
				guild_swear_words.react_emojis.emojis = guild_swear_words.react_emojis.emojis.filter(word => !words.includes(word));
			}
			if (typeof (additional_options.ai_chat_ratio) !== "undefined") { guild_swear_words.ai_bot_chat.percentage = additional_options.ai_chat_ratio; }
			if (typeof (additional_options.react_emoji_ratio) !== "undefined") { guild_swear_words.react_emojis.percentage = additional_options.react_emoji_ratio; }
			data = {
				guild_id: interaction.guild.id,
				swear_words_punishment: guild_swear_words
			};
			await mongodb.UPDATE_GUILD_CONFIG("swear_words_punishment", data);
			interaction.editReply({ content: `${translation["modified"]}`, ephemeral: true });
			break;
		case "list":
			additional_options = {
				action: interaction.options.getString("action") ?? undefined,
				type: interaction.options.getString("type") ?? undefined,
				user: interaction.options.getUser("user") ?? undefined
			};
			no_option_given = [...new Set(Object.values(additional_options))].every(option => option === undefined);
			switch (no_option_given) {
				case true:
					if (guild_swear_words.use_global_preset) {
						guild_swear_words.words = botSettings.base_config.swear_words.words;
						guild_swear_words.ai_bot_chat = botSettings.base_config.swear_words.ai_bot_chat;
						guild_swear_words.react_emojis = botSettings.base_config.swear_words.react_emojis;
					}
					const fields = [
						{
							name: `${translation.list_embed.basic_settings}`,
							value: [
								`**${translation.list_embed.enabled}**: ${translation.list_embed[String(guild_swear_words.enabled)]}`,
								`**${translation.list_embed.use_global_preset}**: ${translation.list_embed[String(guild_swear_words.use_global_preset)]}`,
								`**${translation.list_embed.words}**: ${guild_swear_words.words.join(",")}`,
								`**${translation.list_embed.black_list}**: ${Object.values(guild_swear_words.black_list).join(",")}`,
								`**${translation.list_embed.white_list}**: ${Object.values(guild_swear_words.white_list).join(",")}`
							].join("\n")
						},
						{
							name: `${translation.list_embed.ai_bot_chat_settings}`,
							value: [
								`**${translation.list_embed.use}**: ${translation.list_embed[String(guild_swear_words.ai_bot_chat.use)]}`,
								`**${translation.list_embed.percentage}**: ${guild_swear_words.ai_bot_chat.percentage}`,
								`**${translation.list_embed.black_list}**: ${Object.values(guild_swear_words.ai_bot_chat.black_list).join(",")}`,
								`**${translation.list_embed.white_list}**: ${Object.values(guild_swear_words.ai_bot_chat.white_list).join(",")}`,
								`**${translation.list_embed.force_list}**: ${Object.values(guild_swear_words.ai_bot_chat.force_list).join(",")}`
							].join("\n")
						},
						{
							name: `${translation.list_embed.react_emojis_settings}`,
							value: [
								`**${translation.list_embed.use}**: ${translation.list_embed[String(guild_swear_words.react_emojis.use)]}`,
								`**${translation.list_embed.percentage}**: ${guild_swear_words.react_emojis.percentage}`,
								`**${translation.list_embed.emojis}**: ${guild_swear_words.react_emojis.emojis.join(" ")}`,
								`**${translation.list_embed.black_list}**: ${Object.values(guild_swear_words.react_emojis.black_list).join(",")}`,
								`**${translation.list_embed.white_list}**: ${Object.values(guild_swear_words.react_emojis.white_list).join(",")}`,
								`**${translation.list_embed.force_list}**: ${Object.values(guild_swear_words.react_emojis.force_list).join(",")}`
							].join("\n")
						}
					];
					const embed = new EmbedBuilder();
					embed.setTitle(translation.list_embed.title);
					embed.addFields(fields);
					interaction.editReply({ embeds: [embed], ephemeral: true });
					break;
				case false:
					if (!additional_options.action || !additional_options.type || !additional_options.user) {
						if (additional_options.action === "reset")
							var reset_check = additional_options.action === "reset" && !!additional_options.type;
						switch (reset_check) {
							case true:
								break;
							default:
								interaction.editReply({ content: `${translation["not_all_option_given"]}`, ephemeral: true });
								return;
						}
					}
					const variable_name = `guild_swear_words${additional_options.type}`;
					switch (additional_options.action) {
						case "add":
							eval(`${variable_name}["${additional_options.user.id}"] = "${additional_options.user.username}";`);
							break;
						case "delete":
							eval(`delete ${variable_name}["${additional_options.user.id}"]`);
							break;
						case "reset":
							eval(`${variable_name} = {};`);
							break;
					}
					data = {
						guild_id: interaction.guild.id,
						swear_words_punishment: guild_swear_words
					};
					await mongodb.UPDATE_GUILD_CONFIG("swear_words_punishment", data);
					interaction.editReply({ content: `${translation["modified"]}`, ephemeral: true });
					break;
			}
	}
}
async function set_guild_settings(interaction) {
	const use_locale = helper.translation_locale("guild_settings", interaction.locale);
	const translation = botSettings.base_config.translations.guild_settings[use_locale];
	const options = {
		guild: interaction.guild.id,
		guild_name: interaction.guild.name,
		market: use_locale,
		command: interaction.options.getSubcommand()
	};
	let additional_options, no_option_given, fields, embed;
	const errors = [];
	const guild = botSettings.guilds_config.find(guild => guild.guild_id === interaction.guild.id);
	switch (options.command) {
		case "modify":
			additional_options = {
				active: interaction.options.getBoolean("active") ?? undefined,
				password: interaction.options.getString("password") ?? undefined,
				market: interaction.options.getString("market") ?? undefined,
				language: interaction.options.getString("language") ?? undefined,
				global_world: interaction.options.getString("global_world") ?? undefined,
				global_guild: interaction.options.getString("global_guild") ?? undefined
			};
			no_option_given = [...new Set(Object.values(additional_options))].every(option => option === undefined);
			if (no_option_given) {
				interaction.editReply({ content: `${translation["no_option_given"]}`, ephemeral: true });
				return;
			}
			if (typeof (additional_options.active) !== "undefined") { guild.active = additional_options.active; }
			if (typeof (additional_options.password) !== "undefined") {
				if (interaction.member.guild.ownerId === interaction.user.id) {
					guild.pass = additional_options.password;
				}
			}
			if (typeof (additional_options.market) !== "undefined") {
				const enabled_markets = botSettings.base_config.markets.filter(market => market.enabled === true).map(market => market.market);
				if (!enabled_markets.includes(additional_options.market)) {
					errors.push(translation["market_error"]);
				}
				guild.market = additional_options.market;
			}
			if (typeof (additional_options.language) !== "undefined") {
				const market_translations = Object.keys(botSettings.base_config.translations.guild_settings);
				if (market_translations.includes(additional_options.language)) {
					guild.preferred_language = additional_options.language;
				}
				else {
					errors.push(translation["translation_error"]);
				}
			}
			if (typeof (additional_options.global_world) !== "undefined") { guild.global_world = additional_options.global_world; }
			if (typeof (additional_options.global_guild) !== "undefined") { guild.global_guild = additional_options.global_guild; }

			const data = {
				guild_id: interaction.guild.id,
				guild_name: interaction.guild.name,
				active: guild.active,
				pass: guild.pass,
				market: guild.market,
				preferred_language: guild.preferred_language,
				global_world: guild.global_world,
				global_guild: guild.global_guild
			}
			await mongodb.UPDATE_GUILD_CONFIG("guild_settings", data);
			fields = [
				{
					name: translation["errors"],
					value: errors.join("\n")
				}
			];
			embed = new EmbedBuilder();
			embed.setTitle(translation["modified"]);
			errors.length ? embed.addFields(fields) : null;
			interaction.editReply({ embeds: [embed], ephemeral: true });
			break;
		case "list":
			fields = [
				{
					name: `\u200B`,
					value: [
						`**${translation.list_embed.active}**: ${translation.list_embed[String(guild.active)]}`,
						`**${translation.list_embed.password}**: ${interaction.member.guild.ownerId === interaction.user.id ? guild.pass : translation.list_embed.errors.password}`,
						`**${translation.list_embed.ban}**: ${translation.list_embed[String(guild.ban)]} ${guild.ban ? guild.ban_reason : ""}`,
						`**${translation.list_embed.market}**: ${guild.market}`,
						`**${translation.list_embed.preferred_language}**: ${guild.preferred_language}`,
						`**${translation.list_embed.global_world}**: ${guild.global_world}`,
						`**${translation.list_embed.global_guild}**: ${guild.global_guild}`,
						`**${translation.list_embed.coord_info}**: ${translation.list_embed[String(guild.config.coord_info.active)]}`,
					].join("\n")
				}
			];
			embed = new EmbedBuilder();
			embed.setTitle(translation.list_embed.title);
			embed.addFields(fields);
			interaction.editReply({ embeds: [embed], ephemeral: true });
			break;
	}
}

function bot_invite_embed(channel) {
	const embed = new EmbedBuilder();
	embed.setTitle("HOO Discord bot");
	embed.setDescription(`Sziasztok\nHOO discord botot aki szeretné meg tudja hívni más szerverekre is.\nJelenleg amit tud: foglalásjelző, statisztikák, térképek (Paul bot naponta frissül)`);
	embed.setColor("Aqua");
	const button = new ButtonBuilder()
		.setLabel('Bot meghívása')
		.setURL('https://discord.com/api/oauth2/authorize?client_id=976417736769032202&permissions=1644905888887&scope=bot%20applications.commands')
		.setStyle(ButtonStyle.Link);
	const row = new ActionRowBuilder()
		.addComponents(button);
	discordClient.channels.cache.get(`${channel}`).send({ embeds: [embed], components: [row] });

}
// error handling
process.on("uncaughtException", (error) => {
	if (DEV) { console.log(error); }
	else {
		log_error(error);
	}
})
async function start() {
	await mongodb.START();
	await update_config();
	init_locations();
	await init_cache();
	await discordClient.login(BOT_TOKEN);
	register_base_cronjobs();
	register_guild_cronjobs();
}
start();