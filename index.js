const Config = require('./config.json');
const tmi = require('tmi.js');
const { writeFileSync } = require('node:fs');

Config.save = function saveConfig() {
	process.stdout.write('[+] Saving config...\r');
	writeFileSync('config.json', JSON.stringify(Config, null, '\t'));
	console.log('[+] Config saved.   ');
};

let dirty = false;
Config.channels.forEach(channel => {
	if(!Config.tagSettings[channel]) {
		// JSON.stringify/parse - deepcopy
		Config.tagSettings[channel] = JSON.parse(JSON.stringify(Config.tagSettings['!default']));
		dirty = true;
	}
});
if(dirty)
	Config.Save();

const Client = new tmi.Client({
	options: {
		debug: true
	},
	identity: {
		username: Config.username.toLowerCase(),
		password: Config.token
	},
	channels: [Config.username, ...Config.channels.map(channel => channel.toLowerCase())]
});
Client.connect();

const atMe = `@${Config.username.toLowerCase()}`;

// eslint-disable-next-line no-unused-vars
Client.on('message', async function onMessage(channel, tags, origMessage, self) {
	if(tags.username === Config.username.toLowerCase())
		return;

	const reply = msg => Client.reply(channel, ' ' + msg, tags.id); // Space here to not parse twitch commands like /vip, etc..
	const message = origMessage.toLowerCase();
	const settings = Config.tagSettings[channel.slice(1)];
	const isAdmin = username => username === channel.slice(1) || settings.admins.includes(username); // when adding admins later make sure the added is in lowercase

	if(message.startsWith(atMe)) {
		if(message.startsWith(atMe + ' prefix set')) {
			if(!isAdmin(tags.username))
				return reply('It looks like you do not have permission to change the prefix. Please don\'t try again later.');

			settings.prefix = message.split(' ').slice(3).join(' ');
			Config.save();
			return reply(`Prefix set to: ${settings.prefix}`);
		} else
			return reply(`Current prefix is: ${settings.prefix} (to change - @bot prefix set <new prefix>)`);
	}

	if(!message.startsWith(settings.prefix))
		return;

	let [cmd, ...args] = message.slice(settings.prefix.length).split(' ');
	cmd = cmd.toLowerCase();

	switch(cmd) {
		case 'tag':
			var name = args[1]?.toLowerCase();
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
					return reply(`Tag called ${name} has been yeeted successfully.`);

				case 'list':
					return reply('TODO');
					// TODO: only respond if on bot's channel

				case 'info':
					if(Config.tagSettings['!globalTags'][name])
						return reply(`${name} is a global tag set by the bot owner.`);

					if(!settings.tags[name])
						return reply(`A tag called ${name} doesn't seem to exist.`);

					return reply(`Tag ${name} - owned by ${settings.tags[name].owner}.`); // TODO: maybe add more info here?

				default:
					name = name || args[0];

					if(!name)
						return reply(`${settings.prefix}tag <new|remove|list|info> <name> [...other arguments]`);

					if(Config.tagSettings['!globalTags'][name])
						return reply(Config.tagSettings['!globalTags'][name]);

					if(!settings.tags[name])
						return reply(`A tag called ${name} doesn't seem to exist. You can create it with '${settings.prefix}tag new ${name} <content...>'.`);

					return reply(settings.tags[name].content);

			}
			// No break here because we always return.
		// other commands
		default:
			// There is no message if the tag doesn't exist to allow people to set the prefix to nothing.

			if(Config.tagSettings['!globalTags'][cmd])
				return reply(Config.tagSettings['!globalTags'][cmd]);

			if(settings.tags[cmd])
				return reply(settings.tags[cmd].content);

			return;
	}
});

// TODO: banning users from creating tags
// Admin definition: can delete any tag of any user I guess?