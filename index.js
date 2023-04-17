const Config = require('./config.json');
const tmi = require('tmi.js');
const { writeFileSync } = require('node:fs');

Config.Save = function SaveConfig() {
	console.log('[+] Saving config...');
	writeFileSync('config.json', JSON.stringify(Config, null, '\t'));
};

let dirty = false;
Config.channels.forEach(channel => {
	if(!Config.tagSettings[channel]) {
		// JSON.parse/stringify so we don't end up pushing admin to defaults
		Config.tagSettings[channel] = JSON.parse(JSON.stringify(Config.tagSettings['!default']));
		Config.tagSettings[channel].admins.push(channel);
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
	channels: Config.channels.map(channel => channel.toLowerCase())
});
Client.connect();

const atMe = `@${Config.username.toLowerCase()}`;

Client.on('message', async function onMessage(channel, tags, origMessage, self) {
	const send = msg => Client.say(channel, msg);
	const message = origMessage.toLowerCase();
	const settings = Config.tagSettings[channel.slice(1)];
	const isAdmin = username => settings.admins.includes(username); // when adding admins later make sure the added is in lowercase

	if(message.startsWith(atMe)) {
		if(message.startsWith(atMe + ' prefix set ')) {
			if(!isAdmin(tags.username))
				return send(`@${tags.username} It looks like you do not have permission to change the prefix. Please don't try again later.`);

			settings.prefix = message.split(' ').slice(3).join(' ');
			Config.Save();
			return send(`@${tags.username} Prefix set to: ${settings.prefix}`);
		} else
			return send(`@${tags.username} Current prefix is: ${settings.prefix} (to change - @bot prefix set <new prefix>)`);
	}


});