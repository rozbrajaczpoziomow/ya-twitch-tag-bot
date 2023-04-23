const Config = require('./config.json');
const tmi = require('tmi.js');
const { writeFileSync } = require('node:fs');
const configOptions = {
	'globalLock': 'Prohibits normal users from creating/removing any custom tags',
	'tagRequiresPrefix': 'Whether the bot should send a tag content\'s without a need for the prefix'
};
const configOptionNames = Object.keys(configOptions);

Config.save = function saveConfig() {
	process.stdout.write('[+] Saving config...\r');
	writeFileSync('config.json', JSON.stringify(Config, null, '\t'));
	console.log('[+] Config saved.   ');
};

let dirty = false;
[Config.username, ...Config.channels].forEach(channel => {
	if(!Config.tagSettings[channel.toLowerCase()]) {
		// JSON.stringify/parse - deepcopy
		Config.tagSettings[channel.toLowerCase()] = JSON.parse(JSON.stringify(Config.tagSettings['!default']));
		console.log(`[*] New channel: ${channel}`);
		dirty = true;
	}
	Object.keys(Config.tagSettings['!default']).forEach(property => {
		if(Config.tagSettings[channel.toLowerCase()][property] == undefined) { // undefined to allow for falsy values
			console.log(`- Channel ${channel} missing property \`${property}\` from the defaults - adding automatically.`);
			Config.tagSettings[channel.toLowerCase()][property] = JSON.parse(JSON.stringify(Config.tagSettings['!default'][property]));
			dirty = true;
		}
	});
});

if(dirty)
	Config.save();

const Client = new tmi.Client({
	options: {
		debug: true,
		joinInterval: 300
	},
	identity: {
		username: Config.username.toLowerCase(),
		password: Config.token
	},
	channels: [Config.username, ...Config.channels]
});
Client.connect();

// eslint-disable-next-line no-unused-vars
Client.on('message', async function onMessage(channel, tags, message, self) {
	'use strict';

	if(tags.username === Config.username.toLowerCase())
		return;

	const reply = msg => Client.reply(channel, ' ' + msg, tags.id); // Space here to not parse twitch commands like /vip, etc..
	const settings = Config.tagSettings[channel.slice(1)];
	const isAdmin = username => username === channel.slice(1) || settings.admins.includes(username);

	if(message.toLowerCase().startsWith(`@${Config.username.toLowerCase()}`))
		// copy from switch(cmd) > case 'prefix'
		return reply(`Current prefix: ${settings.prefix}` + (isAdmin(tags.username)? ` (change with '${settings.prefix}prefix set <new prefix>)'` : ''));

	if(!message.startsWith(settings.prefix)) {
		if(!settings.config.tagRequiresPrefix)
			if(settings.tags[name = message.trim().split(' ')[0]] || Config.tagSettings['!globalTags'][name])
				return reply(settings.tags[name]?.content ?? Config.tagSettings['!globalTags'][name]);
		return;
	}

	let [cmd, ...args] = message.slice(settings.prefix.length).trimStart().split(' ');
	cmd = cmd.toLowerCase();

	switch(cmd) {
		case 'tag':
			var name = args[1];
			switch(args[0]?.toLowerCase()) {
				case 'create':
				case 'new':
					if(settings.config.globalLock && !isAdmin(tags.username))
						return reply('You cannot create tags as the globalLock config option is enabled.');

					if(settings.bans.includes(tags.username))
						return reply('It looks like you\'re banned from creating tags... How sad.');

					if(Config.tagSettings['!globalTags'][name])
						return reply(`A global tag already exists with the name ${name}. (Global tags are set by the bot owner)`);

					if(settings.tags[name])
						return reply(`There's already a tag with the name ${name} owned by ${settings.tags[name].owner}.`);

					settings.tags[name] = {
						content: args.slice(2).join(' '),
						owner: tags.username
					};

					Config.save();
					return reply(`Tag called ${name} has been successfully created.`);

				case 'delete':
				case 'remove':
					if(settings.config.globalLock && !isAdmin(tags.username))
						return reply('You cannot delete tags as the globalLock config option is enabled.');

					if(Config.tagSettings['!globalTags'][name])
						return reply(`Global tags can only be deleted by the bot owner by editing the configuration file.`);

					if(!settings.tags[name])
						return reply(`There doesn't seem to be a tag called ${name}.`);

					if(!isAdmin(tags.username) && settings.tags[name].owner != tags.username)
						return reply(`You don't own the tag called ${name}.`);

					delete settings.tags[name];
					Config.save();
					return reply(`Tag called ${name} has been yeeted successfully.`);

				case 'list':
					var channelFor = name || channel.slice(1);

					if(channelFor.startsWith('!') || !Config.tagSettings[channelFor])
						channelFor = channel.slice(1);

					// This is done to prevent spam if you have a large amount of tags.
					if(isAdmin(tags.username) || Config.username.toLowerCase() === channel.slice(1))
						return reply(`Global tags: ${Object.keys(Config.tagSettings['!globalTags']).join(', ')} || Channel tags: ${Object.keys(Config.tagSettings[channelFor].tags).join(', ')}`);

					return reply(`To view the tag list, head over to #${Config.username} and type '${Config.tagSettings[Config.username.toLowerCase()].prefix}tag list ${channel.slice(1)}'`);

				case 'info':
					if(Config.tagSettings['!globalTags'][name])
						return reply(`${name} is a global tag set by the bot owner.`);

					if(!settings.tags[name])
						return reply(`A tag called ${name} doesn't seem to exist.`);

					return reply(`Tag ${name} - owned by ${settings.tags[name].owner}.`); // TODO: maybe add more info here?

				default:
					name = name || args[0];

					if(!name)
						return reply(`Usage: ${settings.prefix}tag <new|remove|list|info> <name> [...other arguments]`);

					return reply(Config.tagSettings['!globalTags'][name] ?? settings.tags[name]?.content ?? `A tag called ${name} doesn't seem to exist. You can create it with '${settings.prefix}tag new ${name} <content...>'.`);

			}
			// No break here because we always return.

		case 'prefix':
			if(args[0] == 'set')
				if(isAdmin(tags.username)) {
					settings.prefix = args.slice(1).join(' ');
					Config.save();
					return reply(`Prefix changed to ${settings.prefix}`);
				} else
					return reply('You don\'t have permission to change the prefix.');
			return reply(`Current prefix: ${settings.prefix}` + (isAdmin(tags.username)? ` (change with '${settings.prefix}prefix set <new prefix>)'` : ''));

		case 'admin':
			var help = `${settings.prefix}admin <add/remove/list> <username>`;

			if(tags.username !== channel.slice(1) || args[0] === 'list')
				return reply(`Admins [${settings.admins.length}]: ${settings.admins.join(', ')}`);

			if(args[0] === 'add') {
				var user = args[1]?.toLowerCase();

				if(!user)
					return reply(help);

				if(user === channel.slice(1))
					return reply('This is your channel, you rule.');

				// TODO: I really should get better messages for these
				if(settings.admins.includes(user))
					return reply(`${user} already was an admin.`);

				settings.admins.push(user);
				Config.save();
				return reply(`${user} is now an admin.`);
			} else if(args[0] === 'remove') {
				var user = args[1]?.toLowerCase();

				if(!user)
					return reply(help);

				if(user === channel.slice(1))
					return reply('This is your channel, you rule.');

				if(!settings.admins.includes(user))
					return reply(`${user} is not an admin.`);

				settings.admins = settings.admins.filter(admin => admin != user);
				Config.save();
				return reply(`${user} is no longer an admin.`);
			}

			return reply(help);

		case 'bans':
			var help = `${settings.prefix}bans <ban/unban/list> <username>`;

			if(!isAdmin(tags.username) || args[0] === 'list')
				return reply(`Banned people [${settings.bans.length}]: ${settings.bans.join(', ')}`);

			if(args[0] === 'ban') {
				var user = args[1]?.toLowerCase();

				if(!user)
					return reply(help);

				if(isAdmin(user))
					return reply('You can\'t ban an admin.');

				if(settings.bans.includes(user))
					return reply(`${user} was already banned. You really must hate him.`);

				settings.bans.push(user);
				Config.save();
				return reply(`${user} has been banned from creating tags.`);
			} else if(args[0] === 'unban') {
				var user = args[1]?.toLowerCase();

				if(!user)
					return reply(help);

				if(!settings.bans.includes(user))
					return reply(`${user} is not banned.`);

				delete settings.bans[user];
				Config.save();
				return reply(`${user} has been unbanned. Have fun creating tags.`);
			}

			return reply(help);

		case 'config':
			var help = `${settings.prefix}config {info <opt>} or {<${configOptionNames.join('/')}> <y/n>}`;

			var option = args[0]?.replaceAll('_', '')?.toLowerCase();

			if(option == 'info') {
				option = args[1]?.replaceAll('_', '')?.toLowerCase();
				if(!option || !configOptionNames.map(opt => opt.toLowerCase()).includes(option))
					return reply(help);

				var realName = configOptionNames[configOptionNames.map(opt => opt.toLowerCase()).indexOf(option)];

				return reply(`${realName} - ${configOptions[realName]} {currently ${settings.config[realName]? 'enabled' : 'disabled'}}`);
			}

			if(!option || !configOptionNames.map(opt => opt.toLowerCase()).includes(option))
				return reply(help);

			if(!isAdmin(tags.username))
				return reply('Sadly it looks like you do not have enough permissions to change the config options');

			var realName = configOptionNames[configOptionNames.map(opt => opt.toLowerCase()).indexOf(option)];

			var truthy = ['y', 'yes', 'yee', 'true', 'enable', 'enabled'];
			var falsy = ['n', 'no', 'naw', 'false', 'disable', 'disabled'];

			var value = args[1]?.toLowerCase();
			if(!value || !(truthy.includes(value) || falsy.includes(value)))
				return reply(help);

			value = truthy.includes(value);
			settings.config[realName] = value;
			Config.save();
			return reply(`Config option ${realName} has been ${value? 'enabled' : 'disabled'}`);

		default:
			var name = message.slice(settings.prefix.length).trimStart().split(' ')[0];

			return reply(Config.tagSettings['!globalTags'][name] ?? settings.tags[name]?.content ?? `No such tag exists, you can create one with ${settings.prefix}tag new ${name} <contents...>`);
	}
});
