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
const { Client, Collection, Events, GatewayIntentBits, PermissionsBitField, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActivityType, REST, Routes } = require("discord.js");

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
function sleep(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
async function update_config() {
	const updated_base_config = await mongodb.GET_BASE_CONFIG("all");
	const updated_guilds_config = await mongodb.GET_GUILDS_CONFIG();
	botSettings.base_config = updated_base_config;
	botSettings.guilds_config = updated_guilds_config;
}
async function update_cached_data(type) {
	delete_unused_files();
	let folder;
	let server;
	switch (type) {
		case "map":
			const types = Object.keys(botSettings.base_config.map_data).map(type => `map_${type}`);
			for (const type of types) {
				folder = fs.readdirSync(botSettings.locations[type]);
				for (const file of folder) {
					server = file.split(".")[0];
					botSettings.cache[type][server] = fs.readFileSync(`${botSettings.locations[type]}${file}`, "utf8").split("\n").filter(line => line.trim().length > 0);
				}
			}
			break;
		case "stats":
			folder = fs.readdirSync(botSettings.locations["daily_stats"]);
			for (const file of folder) {
				server = file.split(".")[0];
				botSettings.cache["daily_stats"][server] = JSON.parse(fs.readFileSync(`${botSettings.locations["daily_stats"]}${file}`, "utf8"));
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
	/*
	let guildArray = discordClient.guilds.cache.map(guild => guild.name);
	console.log(guildArray);
	let membersArray = {};
	Promise.all(discordClient.guilds.cache.map((guild) => guild.members.fetch().then(members => members.forEach(member => {
		try {
			console.log(`${member.user.username}${member.user.tag}`);
			membersArray[guild.name].push(`${member.user.username}${member.user.tag}`);
			console.log(membersArray);
		}
		catch (error) {
			membersArray[guild.name] = [];
			membersArray[guild.name].push(`${member.user.username}${member.user.tag}`);
		}
	})))).then(console.log(membersArray));
	*/
});
discordClient.on(Events.MessageCreate, async (message) => {
	if (message.author.bot) return;
	if (botSettings.base_config.swear_words.words.some(word => message.content.toLowerCase().includes(word))) {
		if (Math.random() * 5 > 4) {
			ai_chatting(message, message.content);
		}
		else if (Math.random() * 5 > 2) {
			const react_emojis = botSettings.base_config.swear_words.react_emojis;
			try {
				message.react(react_emojis[Math.floor(Math.random() * react_emojis.length)]);
			}
			catch (error) { }
		}
		else { }
	}
	const ai_bot_chat_channels = botSettings.guilds_config.flatMap(guild => guild.config.ai_bot_chat_channels.length > 0 ? guild.config.ai_bot_chat_channels : []);
	if (ai_bot_chat_channels.includes(message.channelId)) { ai_chatting(message, message.content); return; }
	if (message.content.toLowerCase().includes("hoo")) { ai_chatting(message, message.content); }
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
				case "ping":
					command.execute(discordClient, interaction);
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
		let use_locale, choices, filtered_choices, final_choices, option;
		if (interaction.commandName === "stat") {
			use_locale = botSettings.base_config.translations.chart.tribe_scope[interaction.locale]["conquer"] ? interaction.locale : "en";
			switch (focused_option.name) {
				case "scope":
					choices = botSettings.base_config.translations.chart.tribe_scope[use_locale][sub_command];
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
						filtered_choices = { ["server_error"]: botSettings.base_config.translations.chart.error[use_locale]["server_error"] };
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
						filtered_choices = { ["server_error"]: botSettings.base_config.translations.chart.error[use_locale]["server_error"] };
						final_choices = filtered_choices;
					}
					break;
				case "type":
					choices = botSettings.base_config.translations.chart.type[use_locale];
					final_choices = choices;
					break;
				case "style":
					choices = botSettings.base_config.translations.chart.style[use_locale];
					final_choices = choices;
					break;
				case "color":
					choices = botSettings.base_config.translations.chart.color[use_locale];
					final_choices = choices;
					break
			}
		}
		else if (interaction.commandName === "map") {
			use_locale = botSettings.base_config.translations.map_pic[interaction.locale]["players_points"] ? interaction.locale : "en";
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
			use_locale = botSettings.base_config.translations.ennoblements[interaction.locale]["barbarian"] ? interaction.locale : "en";
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
		interaction.respond(
			Object.entries(final_choices).map(([key, value]) => ({ name: value, value: key })),
		);
		function sort_ally_by_rank(a, b) {
			var ally_rank_a = +a.split(',')[botSettings.base_config.map_data.ally.data.indexOf("rank")];
			var ally_rank_b = +b.split(',')[botSettings.base_config.map_data.ally.data.indexOf("rank")];
			return ally_rank_a - ally_rank_b;
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
async function help_handler(interaction) {
	const use_locale = botSettings.base_config.translations.help[interaction.locale]["error"] ? interaction.locale : "en";
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
	for (const server of Object.keys(botSettings.cache.map_village)) {
		running_servers_continents[server] = [...new Set(botSettings.cache.map_village[server].map(village => `k${village.split(",")[botSettings.base_config.map_data.village.data.indexOf("y")].charAt(0)}${village.split(",")[botSettings.base_config.map_data.village.data.indexOf("x")].charAt(0)}`))].sort();
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
	const enabled_markets = botSettings.base_config.markets.filter(market => market.enabled === true).map(market => market.market);
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
			const servers_of_market = botSettings.base_config.running_servers.filter(server => server.startsWith(market) && !["s", "p", "c"].some((prefix) => server.slice(2).startsWith(prefix)));
			const servers_sorted = prioritize_server(servers_of_market);
			const priority_servers_to_download = servers_sorted; //.slice(0, 2); removed disabling older servers
			const daily_stat_cronjobs = botSettings.guilds_config.flatMap(guild => guild.config.cronjobs.filter(cronjob => cronjob.type === "stat" && cronjob.message?.command === "daily" && cronjob.play === true && botSettings.base_config.running_servers.includes(cronjob.message?.server)));
			const daily_stat_cronjobs_servers = daily_stat_cronjobs.map(cronjob => cronjob.message.server);
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
				fs.writeFile(`${botSettings.locations.daily_stats}${server}.json`, server_stat_json, 'utf8', function (error) {
					if (error) { console.log(error); }
				});
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
					await sleep(100);
				}
				resolve();
			}
			catch (error) { console.log(`error: ${server} ${type} ${error}`); resolve(); }
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
	const use_locale = botSettings.base_config.translations.ennoblements[interaction.locale]["command_message"] ? interaction.locale : "en";
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
	let additional_options, data, tribes;
	const ennoblements_cronjobs = botSettings.guilds_config.flatMap(guild => guild.config.cronjobs.filter(cronjob => cronjob.type === "ennoblement" && guild.guild_id === options.guild));
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
			const fields = [];
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
			const embed = new EmbedBuilder();
			embed.setTitle(translation.list_embed.title);
			embed.addFields(fields.splice(0, 20));
			interaction.editReply({ embeds: [embed], ephemeral: true });
			break;
	}
}
async function live_ennoblements() {
	const botSettings_copy = {
		base_config: botSettings.base_config,
		guilds_config: botSettings.guilds_config
	};
	const ennoblements_options = botSettings_copy.base_config.ennoblements.options;
	const ennoblements_options_indexes = Object.keys(ennoblements_options);
	const colors = botSettings_copy.base_config.ennoblements.colors;
	const date = new Date();
	date.setSeconds(0);
	date.setMilliseconds(0);
	const date_stamp = (date.getTime() / 1000) - 60;
	const ennoblements_cronjobs = botSettings_copy.guilds_config.flatMap(guild => guild.config.cronjobs.filter(cronjob => cronjob.type === "ennoblement" && cronjob.play === true));
	const servers = [...new Set(ennoblements_cronjobs.map(cron => cron.message[ennoblements_options_indexes.indexOf("server")]))];
	const map_village_indexes = botSettings_copy.base_config.map_data.village.data;
	const map_player_indexes = botSettings_copy.base_config.map_data.player.data;
	const map_ally_indexes = botSettings_copy.base_config.map_data.ally.data;
	const ennoblements_indexes = botSettings_copy.base_config.map_data.conquer.data;
	servers.forEach(server => get_ennoblements(server));

	async function get_ennoblements(server) {
		const market = botSettings_copy.base_config.markets.find(market => market.market === server.substring(0, 2));
		if (!market.enabled) { return; }
		const response = await axios.get(`https://${server}${market.link}/interface.php?func=get_conquer&since=${date_stamp}`);
		const ennoblements = response.data.split("\n");
		if (ennoblements.toString().length < 5) { return; }
		const map_village = botSettings.cache["map_village"][server];
		const map_player = botSettings.cache["map_player"][server];
		const map_ally = botSettings.cache["map_ally"][server];
		for (const ennoblement of ennoblements) {
			const ennob_village_id = ennoblement.split(",")[map_village_indexes.indexOf("id")];
			const ennob_village = map_village.find(village => village.split(",")[map_village_indexes.indexOf("id")] === ennob_village_id).split(",");
			const ennob_village_name = decodeURIComponent(ennob_village[map_village_indexes.indexOf("name")].replaceAll("+", " "));
			const ennob_village_coord = `${ennob_village[map_village_indexes.indexOf("x")]}|${ennob_village[map_village_indexes.indexOf("y")]}`;
			const ennob_village_continent = `k${ennob_village[map_village_indexes.indexOf("y")].charAt(0)}${ennob_village[map_village_indexes.indexOf("x")].charAt(0)}`;
			const ennob_village_link = `[${ennob_village_name} (${ennob_village_coord}) ${ennob_village_continent.replace("k", "K")}](https://${server}${market.link}/game.php?village=0&screen=info_village&id=${ennob_village_id})`;
			const ennob_date = new Date(+ennoblement.split(",")[ennoblements_indexes.indexOf("unix_timestamp")] * 1000);
			const ennob_old_player_id = ennoblement.split(",")[ennoblements_indexes.indexOf("old_owner")];
			const ennob_old_player = map_player.find(player => player.split(",")[map_player_indexes.indexOf("id")] === ennob_old_player_id)?.split(",");
			const ennob_old_player_name = typeof ennob_old_player !== "undefined" ? decodeURIComponent(ennob_old_player[map_player_indexes.indexOf("name")].replaceAll("+", " ")) : "barb_player_name";
			let ennob_old_player_link = typeof ennob_old_player !== "undefined" ? `[${ennob_old_player_name}](https://${server}${market.link}/game.php?village=0&screen=info_player&id=${ennob_old_player_id})` : ennob_old_player_name;
			const ennob_old_player_ally_id = typeof ennob_old_player !== "undefined" ? ennob_old_player[map_player_indexes.indexOf("ally")] : undefined;
			const ennob_old_player_ally = typeof ennob_old_player !== "undefined" && ennob_old_player_ally_id !== "0" ? map_ally.find(ally => ally.split(",")[map_ally_indexes.indexOf("id")] === ennob_old_player_ally_id)?.split(",") : "";
			const ennob_old_player_ally_tag = typeof ennob_old_player !== "undefined" && ennob_old_player_ally_id !== "0" ? decodeURIComponent(ennob_old_player_ally[map_ally_indexes.indexOf("tag")].replaceAll("+", " ")) : "";
			const ennob_old_player_ally_link = typeof ennob_old_player !== "undefined" && ennob_old_player_ally_id !== "0" ? `[[${ennob_old_player_ally_tag}]](https://${server}${market.link}/game.php?village=0&screen=info_ally&id=${ennob_old_player_ally_id})` : "";
			const ennob_new_player_id = ennoblement.split(",")[ennoblements_indexes.indexOf("new_owner")];
			const ennob_new_player = map_player.find(player => player.split(",")[map_player_indexes.indexOf("id")] === ennob_new_player_id).split(",");
			const ennob_new_player_name = decodeURIComponent(ennob_new_player[map_player_indexes.indexOf("name")].replaceAll("+", " "));
			const ennob_new_player_link = `[${ennob_new_player_name}](https://${server}${market.link}/game.php?village=0&screen=info_player&id=${ennob_new_player_id})`;
			const ennob_new_player_ally_id = ennob_new_player[map_player_indexes.indexOf("ally")];
			const ennob_new_player_ally = ennob_new_player_ally_id !== "0" ? map_ally.find(ally => ally.split(",")[map_ally_indexes.indexOf("id")] === ennob_new_player_ally_id)?.split(",") : "";
			const ennob_new_player_ally_tag = ennob_new_player_ally_id !== "0" ? decodeURIComponent(ennob_new_player_ally[map_ally_indexes.indexOf("tag")].replaceAll("+", " ")) : "";
			const ennob_new_player_ally_link = ennob_new_player_ally_id !== "0" ? `[[${ennob_new_player_ally_tag}]](https://${server}${market.link}/game.php?village=0&screen=info_ally&id=${ennob_new_player_ally_id})` : "";

			const cronjobs_for_server = ennoblements_cronjobs.filter(cron => cron.message[ennoblements_options_indexes.indexOf("server")] === server);
			for (const cronjob of cronjobs_for_server) {
				const guild_locale = botSettings_copy.guilds_config.find(guild => guild.config.cronjobs.some(cron => cron === cronjob)).market;
				const use_translation = botSettings_copy.base_config.translations.ennoblements[guild_locale]["barbarian"] ? botSettings_copy.base_config.translations.ennoblements[guild_locale] : botSettings_copy.base_config.translations.ennoblements["en"];
				if (ennob_old_player_link === "barb_player_name") { ennob_old_player_link = use_translation["barbarian"] }
				const enabled_continents = cronjob.message[ennoblements_options_indexes.indexOf("continent")].split("&");
				if (!enabled_continents.includes("all")) {
					if (!enabled_continents.includes(ennob_village_continent)) {
						continue;
					}
				}
				const ennoblements_Embed = new EmbedBuilder();
				let create_embed = false;
				switch (cronjob.message[ennoblements_options_indexes.indexOf("tribe")]) {
					case "all":
						if (typeof ennob_old_player !== "undefined") {
							if (ennob_new_player_id === ennob_old_player_id && cronjob.message[ennoblements_options_indexes.indexOf("self")]) { create_embed = true; ennoblements_Embed.setColor(colors.self) }
							else if (ennob_new_player_ally_id === ennob_old_player_ally_id && ennob_new_player_ally_id !== "0" && cronjob.message[ennoblements_options_indexes.indexOf("internal")]) { create_embed = true; ennoblements_Embed.setColor(colors.internal) }
							else if (cronjob.message[ennoblements_options_indexes.indexOf("gain")]) { create_embed = true; ennoblements_Embed.setColor(colors.gain) }
						}
						if (typeof ennob_old_player === "undefined" && cronjob.message[ennoblements_options_indexes.indexOf("barbarian")]) { create_embed = true; ennoblements_Embed.setColor(colors.barbarian); }
						break;
					default:
						const new_player_tribe_equals = Object.keys(cronjob.message[ennoblements_options_indexes.indexOf("tribe")]).includes(ennob_new_player_ally_id) ? true : false;
						const old_player_tribe_equals = Object.keys(cronjob.message[ennoblements_options_indexes.indexOf("tribe")]).includes(ennob_old_player_ally_id) ? true : false;
						if (new_player_tribe_equals) {
							if (typeof ennob_old_player !== "undefined") {
								if (ennob_new_player_id === ennob_old_player_id) {
									if (cronjob.message[ennoblements_options_indexes.indexOf("self")]) {
										create_embed = true; ennoblements_Embed.setColor(colors.self)
									}
								}
								else if (ennob_new_player_ally_id === ennob_old_player_ally_id) {
									if (ennob_new_player_ally_id !== "0" && cronjob.message[ennoblements_options_indexes.indexOf("internal")]) {
										create_embed = true; ennoblements_Embed.setColor(colors.internal)
									}
								}
								else if (cronjob.message[ennoblements_options_indexes.indexOf("gain")]) {
									create_embed = true; ennoblements_Embed.setColor(colors.gain)
								}
							}
							if (typeof ennob_old_player === "undefined" && cronjob.message[ennoblements_options_indexes.indexOf("barbarian")]) { create_embed = true; ennoblements_Embed.setColor(colors.barbarian); }
						}
						else if (old_player_tribe_equals) {
							if (cronjob.message[ennoblements_options_indexes.indexOf("loss")]) { create_embed = true; ennoblements_Embed.setColor(colors.loss) }
						}
						else { }
						break;
				}
				if (create_embed) {
					const embed_footer_text = `${server} | ${ennob_date.getFullYear()}.${ennob_date.getMonth() + 1}.${ennob_date.getDate()} ${ennob_date.getHours()}:${ennob_date.getMinutes()}:${ennob_date.getSeconds()}`;
					ennoblements_Embed.setDescription(`${ennob_new_player_link} ${ennob_new_player_ally_link} ${use_translation["nobled"]} ${ennob_village_link} (${use_translation["old_owner"]}: ${ennob_old_player_link} ${ennob_old_player_ally_link})`);
					ennoblements_Embed.setFooter({ text: embed_footer_text });
					discordClient.channels.cache.get(cronjob.channel_id).send({ embeds: [ennoblements_Embed] });
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
		const use_locale = botSettings.base_config.translations.speed[cronjob.message.locale]["title"] ? cronjob.message.locale : "en";
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
			use_locale = botSettings.base_config.translations.chart.tribe_scope[guild.market]["conquer"] ? guild.market : "en";
			options = {
				command: cron.message.command,
				scope: cron.message.scope ?? "conquer",
				server: cron.message.server,
				size: cron.message.size ?? 20,
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
			use_locale = botSettings.base_config.translations.chart.tribe_scope[interaction.locale]["conquer"] ? interaction.locale : "en";
			options = {
				command: interaction.options.getSubcommand(),
				scope: interaction.options.getString("scope") ?? "conquer",
				server: interaction.options.getString("server"),
				size: interaction.options.getNumber("size") ?? 20,
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
			conquer();
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
	function conquer() {
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
				return `${botSettings.base_config.translations.chart.title[use_locale]["daily"]} ${botSettings.base_config.translations.chart.title[use_locale][options.scope]} ${botSettings.base_config.translations.chart.title[use_locale]["stat"]}     ${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
			}
			else {
				return `${options.ally}  ${botSettings.base_config.translations.chart.title[use_locale]["daily"]} ${botSettings.base_config.translations.chart.title[use_locale][options.scope]} ${botSettings.base_config.translations.chart.title[use_locale]["stat"]}     ${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
			}
		}
		else if (options.command === "conquer") {
			const from_date_formatted = `${from_date.getFullYear()}.${from_date.getMonth() + 1}.${from_date.getDate()}`;
			const to_date_formatted = `${to_date.getFullYear()}.${to_date.getMonth() + 1}.${to_date.getDate()}`;
			return `${options.server} Top ${options.size} klán foglalás statisztika   ${from_date_formatted}-${to_date_formatted}`;
		}
		else if (options.command === "od") {
			if (options.ally === "") {
				return `${botSettings.base_config.translations.chart.title[use_locale][options.scope]} ${botSettings.base_config.translations.chart.title[use_locale]["stat"]}     ${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
			}
			else {
				return `${options.ally}  ${botSettings.base_config.translations.chart.title[use_locale][options.scope]} ${botSettings.base_config.translations.chart.title[use_locale]["stat"]}     ${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
			}
		}
		else { }
	}
	function generate_dataset_labels(chart_data) {
		const datasets = chart_data.data.datasets;
		if (options.command === "conquer") {
		}
		else {
			try {
				datasets.forEach(dataset => dataset.label = botSettings.base_config.translations.chart.dataset_label[use_locale][options.scope][options.style][dataset.label]);
			}
			catch (error) {
				datasets.forEach(dataset => dataset.label = botSettings.base_config.translations.chart.dataset_label[use_locale][options.scope]["combined"]["sum"]);
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
			else if (filled_data_arrays > 2 || options.type === "violin") { delete datasets.sum; }
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
				chart_data.options.plugins.datalabels.color = "black";
				break;
			case "white":
				chart_data.options.title.fontColor = "black";
				chart_data.options.legend.labels.fontColor = "black";
				chart_data.options.scales.xAxes[0].ticks.fontColor = "black";
				chart_data.options.scales.yAxes[0].ticks.fontColor = "black";
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
			time: "10 0 * * *",
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
async function ai_chatting(message, args) {
	async function ai_messaging(message) {
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
	if (message.content.toLowerCase().startsWith("hoo")) { message.content = message.content.substring(4, message.content.length) }
	const translate_text_en = await translate("hu", "en", message.content);
	const ai_messaging_text = await ai_messaging(`\nMe: ${translate_text_en}\nDonGábor:`);
	if (ai_messaging_text === undefined) { return; }
	const back_translated_text = await translate("en", "hu", ai_messaging_text);
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
		await sleep(5000);
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
async function message_delete(channel_id, message_id) {
	discordClient.channels.fetch(channel_id).then(channel => {
		channel.messages.delete(message_id);
	});
}
async function message_create(channel_id, message) {
	discordClient.channels.cache.get(channel_id).send(message);
}
// error handling
process.on("uncaughtException", (error) => {
	if (DEV) { console.log(error); }
	else {
		discordClient.channels.cache.get(botSettings.base_config.dev_channels.prod_errors).send(error.toString());
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