"use strict";

const EventEmitter = require('events');
const Guild = require('./guild.js');
const MessageHandler = require('./message-handler.js');
const util = require('util');
const Discord = require('discord.io');
const async = require('async');

class StoryDice extends EventEmitter {
	constructor(configuration) {
		super();
		this.configuration = configuration;

		async.parallel(
			[
				(cb) => {
					this.bot = new Discord.Client(configuration.bot);
					this.bot.once('ready', () => {
						this.bot.on('message', (user, userID, channelID, message, rawEvent) => {
							this.botMessage(user, userID, channelID, message, rawEvent);
						});

						cb();
					});

					this.bot.connect();
				}
			],
			(err, results) => {
				if (err) throw err;
				console.log('Bot initialized.');
			}
		);
	}

	parseResultOutput(result, userID, channelID) {
		var destinations = {};

		result.output.forEach(
			(currentValue) => {
				var destination;
				if (currentValue.type == 'pm') {
					destination = userID;
				} else {
					destination = channelID;
				}

				if (!(destination in destinations)) {
					destinations[destination] = [];
				}

				destinations[destination].push(currentValue);
			}
		);

		return destinations;
	}

	botMessage(user, userID, channelID, message, rawEvent) {
		var user = this.bot.users[userID];

		// We never want to handle bot messages. Otherwise we run the risk of endless looping.
		if (user.bot) return;

		var channel = this.bot.channels[channelID];
		if (channel) {
			var server = this.bot.servers[channel.guild_id];
		} else {
			var server = null;
		}
		var member = null;
		var roles = null;
		if (server) {
			member = server.members[userID];
			roles = Object.keys(member.roles).map(
				(idx) => {
					return server.roles[member.roles[idx]];
				}
			);
		}


		var messageHandler = new MessageHandler(
			this.bot,
			server,
			channel,
			user,
			member,
			roles
		);

		messageHandler.handle(
			message,
			this.mysql,
			(result) => {
				if (result.output.length == 0) return;

				var destinations = this.parseResultOutput(result, userID, channelID);

				var keys = Object.keys(destinations);
				keys.forEach(
					(currentValue) => {
						var pieces = destinations[currentValue];

						var totallyVerified = pieces.every(
							(item) => {
								return item.verified;
							}
						);

						var tag = member.nick ? member.nick : user.username;

						var message = pieces.map(
							(item) => {
								return item.stringified;
							}
						).join('');

						var toSend = '';
						if (totallyVerified) {
							toSend += ':game_die: ';
						}
						toSend += tag;
						toSend += ": ";
						toSend += message;

						this.bot.sendMessage(
							{
								to: currentValue,
								message: toSend
							},
							(err, response) => {
								//console.log(err, response);
							}
						);
					}
				);
			}
		);
	}
}

module.exports = StoryDice;
