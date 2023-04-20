const Config = require('./config.json');
const tmi = require('tmi.js');
const { writeFileSync } = require('node:fs');

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
		dirty = true;
	}
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
	// const message = origMessage.toLowerCase();
	const settings = Config.tagSettings[channel.slice(1)];
	const isAdmin = username => username === channel.slice(1) || settings.admins.includes(username); // when adding admins later make sure the added is in lowercase

	if(message.toLowerCase().startsWith(`@${Config.username.toLowerCase()}`))
		// copy from switch(cmd) > case 'prefix'
		return reply(`Current prefix: ${settings.prefix}` + (isAdmin(tags.username)? ` (change with '${settings.prefix}prefix set <new prefix>)'` : ''));

	if(!message.startsWith(settings.prefix))
		return;

	let [cmd, ...args] = message.slice(settings.prefix.length).trimStart().split(' ');
	cmd = cmd.toLowerCase();

	switch(cmd) {
		case 'tag':
			var name = args[1];
			switch(args[0]?.toLowerCase()) {
				case 'create':
				case 'new':
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
					return reply(`Prefix successfully changed to ${settings.prefix}`);
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
					settings.reply(`${user} already was an admin.`);

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

				delete settings.admins[user];
				Config.save();
				return reply(`${user} is no longer an admin.`);
			}

			return reply(help);

		// other commands
		default:
			// There is no message if the tag doesn't exist to allow people to set the prefix to nothing.
			var name = message.slice(settings.prefix.length).trimStart().split(' ')[0];
			var content = Config.tagSettings['!globalTags'][name] ?? settings.tags[name]?.content;

			if(content)
				return reply(content);

			break;
	}
});

// TODO:
// Add so (admins/channel?) can disable users from creating tags
// Admins/channel can ban users from creating tags (admins can't ban/remove/add other admins)
// Add a tagRequiresPrefix config property - self-explanatory - if on the default case in global switch(cmd) shall reply if no tag is found