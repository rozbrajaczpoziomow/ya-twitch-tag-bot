const Config = require('./config.json');
const tmi = require('tmi.js');

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