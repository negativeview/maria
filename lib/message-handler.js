"use strict";

var token = "$";

const CodeHandler = require('./code-handler.js');
const SerializeHelper = require('maria-serialize');
const async = require('async');
const RollCommand = require('./roll-command.js');
const CommandResult = require('./command-result.js');
const vm = require('vm');
const Dice = require('maria-dice');
const Character          = require('./character.js');

class MessageHandler {
	constructor(bot, server, channel, user, member, roles) {
		this.bot = bot;
		this.server = server;
		this.channel = channel;
		this.user = user;
		this.member = member;
		this.roles = roles;

		this.commands = {};
		this.commands['roll'] = new RollCommand();
		this.commands['r'] = this.commands['roll'];
		this.commands['invite'] = {
			handle: (command, commandResult, cb) => {
				commandResult.output.push(
					{
						type: 'invite',
						verified: true,
						stringified: 'To invite the bot, go to ' + this.bot.inviteURL
					}
				);
				return cb();
			}
		};
	}

	handle(message, mysql, cb) {
		var commandResult = new CommandResult();

		async.series(
			[
				(cb) => {
					this.beforeMessage(
						message,
						mysql,
						commandResult,
						cb
					);
				},
				(cb) => {
					this.handleMessage(
						message,
						mysql,
						commandResult,
						cb
					);
				},
				(cb) => {
					this.afterMessage(
						message,
						mysql,
						commandResult,
						cb
					);
				}
			],
			(err, results) => {
				if (err) {
					console.log(err);
					return;
				}

				if (commandResult.output.length) {
					console.log(commandResult.output);
				}

				return cb(commandResult);
			}
		);
	}

	beforeMessage(message, mysql, commandResult, cb) {
		commandResult.raw = {
			server: this.server,
			channel: this.channel,
			user: {
				user: this.user,
				member: this.member,
				roles: this.roles
			},
			message: message,
		};
		commandResult.output = [];
		return cb();
	}

	handleMessage(message, mysql, commandResult, cb) {
		if (message[0] != token) return cb();

		// Break code handling into a separate place.
		if (message[1] == token) {
			return this.handleCode(message, mysql, commandResult, cb);
		}

		var piecesA = message.split(/(?!u)"/);
		var pieces = [];

		piecesA.forEach(
			(currentItem, index) => {
				if (index == 0 && currentItem[currentItem.length - 1] == ' ') {
					currentItem = currentItem.substr(0, currentItem.length - 1);
				}
				if (index % 2 == 0) {
					var is = currentItem.split(' ');
					is.forEach(
						(currentItem) => {
							pieces.push(currentItem);
						}
					);
				} else {
					pieces.push(currentItem);
				}
			}
		);

		var command = pieces[0].substr(1);

		if (command in this.commands) {
			return this.commands[command].handle(message, commandResult, cb);
		} else {
			var c = token + token + ' ' + command + '(' + pieces.filter(
				(element, index, array) => {
					return index != 0;
				}
			).map(
				(currentValue, index, array) => {
					return '"' + currentValue.replace(/"/g, '\\"') + '"';
				}
			).join(', ') + ');';
			console.log('sending', c);
			return this.handleCode(c, mysql, commandResult, cb);
		}

		return cb();
	}

	handleCode(message, mysql, commandResult, cb) {
		message = message.substr(2);

		var context = {
			data: {
				server: this.server,
				channel: this.channel,
				user: this.user,
				member: this.member,
				roles: this.roles
			},
			pm: (item) => {
				var ret = '';
				switch (typeof(item)) {
					case 'string':
						ret = item;
						break;
					default:
						ret = JSON.stringify(item, null, "\t");
						break;
				}
				commandResult.output.push(
					{
						type: 'pm',
						verified: false,
						stringified: ret
					}
				);
			},
			echo: (item, data) => {
				var ret = '';
				switch (typeof(item)) {
					case 'string':
						ret = item;
						break;
					case 'function':
						ret = item.toString();
						break;
					default:
						ret = JSON.stringify(item, null, "\t");
						break;
				}

				if (data && data.code) {
					var ret2 = "```" + ret + "```";
					ret = ret2;
				}
				commandResult.output.push(
					{
						type: 'echo',
						verified: false,
						stringified: ret
					}
				);
			},
			roll: (item) => {
				var rollParser = new Dice.RollParser();
				var rollInput = rollParser.parse(item);
				rollInput.execute();

				return rollInput.result;
			},
			rollstats: () => {
				var rolls = [];
				var ret = "\n`";

				for (var i = 0; i < 6; i++) {
					var r = context.roll("4d6kh3");
					rolls.push(r);
				}

				ret += rolls.sort(
					(a, b) => {
						return b.plain - a.plain;
					}
				).map(
					(item) => {
						return item.tokens[0].rolls.sort(
							(a, b) => {
								return a.keptValue - b.keptValue;
							}
						).map(
							(item) => {
								if (item.kept) {
									return item.keptValue;
								} else {
									return '(' + item.keptValue + ')';
								}
							}
						).join(', ') + " => " + (item.plain < 10 ? (' ' + item.plain) : item.plain);
					}
				).join("`\n`");
				ret += '`';
				commandResult.output.push(
					{
						type: 'rollstats',
						verified: true,
						stringified: ret
					}
				);
			},
			rollFormat: (item) => {
				return this.commands.roll.stringify(item);
			},
			inArguments: function(args, toFind) {
				return Array.from(args).indexOf(toFind) > -1;
			},
			getArguments: function(arg, idx) {
				var keys = Object.keys(arg);
				for (var i = 0; i < keys.length; i++) {
					values.push(arg[keys[i]]);
				}
				var newName = values.filter(
					(element, index, array) => {
						return index > idx - 1;
					}
				).join(' ');
				return newName;
			},
			Character: Character,
			Dice: Dice
		};

		context = vm.createContext(context);

		vm.runInContext('var user = {}; var channel = {}; var server = {};', context);

		async.parallel(
			[
				(cb) => {
					mysql.query(
						'SELECT * FROM sd_macro WHERE discord_id = "' + this.user.id + '"',
						(err, rows, fields) => {
							if (err) throw err;

							console.log('from user', rows);

							for (var i = 0; i < rows.length; i++) {
								var body = rows[i].body;
								vm.runInContext(rows[i].name + ' = ' + body, context);
								vm.runInContext('user["' + rows[i].name + '"] = ' + body, context);
							}

							return cb();
						}
					)
				},
				(cb) => {
					mysql.query(
						'SELECT * FROM sd_macro WHERE discord_id = "' + this.server.id + '"',
						(err, rows, fields) => {
							if (err) throw err;

							for (var i = 0; i < rows.length; i++) {
								var body = rows[i].body;
								vm.runInContext(rows[i].name + ' = ' + body, context);
								vm.runInContext('server["' + rows[i].name + '"] = ' + body, context);
							}

							return cb();
						}
					)
				},
				(cb) => {
					mysql.query(
						'SELECT * FROM sd_macro WHERE discord_id = "' + this.channel.id + '"',
						(err, rows, fields) => {
							if (err) throw err;

							for (var i = 0; i < rows.length; i++) {
								var body = rows[i].body;
								vm.runInContext(rows[i].name + ' = ' + body, context);
								vm.runInContext('channel["' + rows[i].name + '"] = ' + body, context);
							}

							return cb();
						}
					)
				},
			],
			(err, results) => {
				if (err) throw err;

				try {
					vm.runInContext(message, context);

					this.saveContext(context, mysql, cb);
				} catch (e) {
					commandResult.output.push(
						{
							type: 'exception',
							verified: true,
							stringified: e.toString()
						}
					);
					return cb();
				}
			}
		);
	}

	saveContext(context, mysql, cb) {
		var toSave = [];

		var keys = Object.keys(context.user);
		for (var i = 0; i < keys.length; i++) {
			var item = context.user[keys[i]];
			if (typeof(item) == 'function') {
				toSave.push(
					{
						discord_id: this.user.id,
						name: keys[i],
						value: context.user[keys[i]].toString()
					}
				);
			}
		}

		keys = Object.keys(context.channel);
		for (var i = 0; i < keys.length; i++) {
			var item = context.channel[keys[i]];
			if (typeof(item) == 'function') {
				toSave.push(
					{
						discord_id: this.channel.id,
						name: keys[i],
						value: context.channel[keys[i]].toString()
					}
				);
			}
		}

		keys = Object.keys(context.server);
		for (var i = 0; i < keys.length; i++) {
			var item = context.server[keys[i]];
			if (typeof(item) == 'function') {
				toSave.push(
					{
						discord_id: this.server.id,
						name: keys[i],
						value: context.server[keys[i]].toString()
					}
				);
			}
		}

		async.each(
			toSave,
			(item, callback) => {
				mysql.query(
					'INSERT INTO sd_macro(discord_id, name, body) VALUES(?, ?, ?) ON DUPLICATE KEY UPDATE body = ?',
					[
						item.discord_id,
						item.name,
						item.value,
						item.value
					],
					(err) => {
						return callback(err);
					}
				);
			},
			(err) => {
				return cb(err);
			}
		);
	}

	afterMessage(message, mysql, commandResult, cb) {
		//console.log('after', message);
		return cb();
	}
}

module.exports = MessageHandler;