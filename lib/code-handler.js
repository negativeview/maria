"use strict";

const vm = require('vm');
const Character = require('./character.js');
const Dice = require('./dice.js');

function CodeHandler(userID, userName, serverID, channelID, isAdmin) {
	this.serverID = serverID;
	this.channelID = channelID;
	this.userID = userID;
	this.userName = userName;
	this.isAdmin = isAdmin;
	this.returnedMessages = [];
}

CodeHandler.prototype.hydrate = function(data) {
	var v = new vm.Script(
		'var data = ' + data
	);
	var context = {
		Character: Character,
		Dice: Dice
	};
	v.runInNewContext(
		context,
		{}
	);
	return context.data;
}

CodeHandler.prototype.handleSimple = function(pieces, variableHolder, cb) {
	var macroName = pieces[0].substring(1);
	var codeToRun = macroName + '(';
	codeToRun += pieces.filter(
		(element, index, array) => {
			return index != 0;
		}
	).map(
		(currentValue, index, array) => {
			return '"' + currentValue.replace(/"/g, '\\"') + '"';
		}
	).join();
	codeToRun += ')';

	this.handle(codeToRun, variableHolder, cb);
}

CodeHandler.prototype.handle = function(code, variableHolder, cb) {
	var child_process = require('child_process');
	var child = child_process.fork(
		'./lib/code-child.js',
		[],
		{}
	);

	child.on(
		'message',
		(m) => {
			switch(m.type) {
				case 'error':
					this.returnedMessages[this.returnedMessages.length] = {
						success: false,
						message: m.message,
						destination: 'user',
						validated: true
					};
					break;					
				case 'echo':
					this.returnedMessages[this.returnedMessages.length] = {
						success: true,
						message: m.string,
						destination: 'channel',
						validated: false
					};
					break;
				case 'pm':
					this.returnedMessages[this.returnedMessages.length] = {
						success: true,
						message: m.string,
						destination: 'user',
						validated: false
					};
					break;
				case 'result':
					console.log('result!');

					variableHolder.refresh(() => {
						return cb(this.returnedMessages);
					});
					break;
			}
		}
	);

	//this.isAdmin = false;
	child.send(
		{
			type: 'setup',
			code: code,
			doSaveData: true,
			userID: this.userID,
			userName: this.userName,
			isAdmin: this.isAdmin,
			serverID: this.serverID,
			channelID: this.serverID ? this.channelID : null
		}
	);
}

module.exports = CodeHandler;