# Yet Another Twitch Tag Bot  
`Why? Because why not.`  

## Commands  
```bat  
Command prefix is assumed to be ^  
Spaces after the prefix but before the actual command will be trimmed off, e.g. `^`, `^ ` and `^  ` are all treated equally  
Arguments: <required>; [optional]; ... - can be more than 1  

Any message that starts with @<bot name>  
	- sends you the currently set prefix  

^tag new <name> [content...]  
^tag create <name> [content...]  
	- creates a new tag called `name`  
^tag delete <name>  
^tag remove <name>  
	- if you're the owner of the tag or an admin - deletes the tag `name`  
	- otherwise - too bad  
^tag list [channel]  
	- if admin - lists the global and channel-set tags  
	- otherwise - sends to you the bot's channel to avoid chat spam/clutter  
^tag info <name>  
	- gives you information about a tag (owner / is global)  
^tag <tag>  
	- if the tag specified exists - sends the contents  
	- otherwise - sends a generic message  

^prefix  
	- sends you the prefix that you just used to send this command  
^prefix set [prefix...]  
	- if admin - sets the prefix to whatever you specify (can be empty - probably not a great idea though)  
	- otherwise - too bad  

^admin add <username>  
	- if channel owner - adds the username as an admin  
	- otherwise - behaves the same as `^admin list`  
^admin remove <username>  
	- if channel owner - removes the username from the admins  
	- otherwise - behaves the same as `^admin list`  
^admin list  
	- lists the admins... what did you expect?  

^bans ban <username>  
	- if admin - bans the user from creating new tags  
	- otherwise - behaves the same as `^bans list`  
^bans unban <username>  
	- if admin - unbans the user from creating new tags  
	- otherwise - behaves the same as `^bans list`  
^bans list  
	- lists the banned users... what did you expect?  

^config info <option>  
	- sends a short description about the mentioned config option  
^config <option> <y/n>  
	- if admin - sets the specified config option to the specified value  
	- otherwise - too bad  
Currently implemented config options: `globalLock, tagRequiresPrefix`  

^<tag>  
	- if tag exists - sends the contents  
	- otherwise - sends a generic message  
```  

## Installation  
Install NodeJS.  
Run `npm i .` to install the required packages.  
Change/modify the config to your liking.  
And start the bot with `nodejs index.js`.  

## Configuration  
A basic config/example can be found @ config.example.json.  
