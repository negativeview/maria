"use strict";

function VariablesHolder() {
	this.servers = {};
	this.users = {};
	this.channels = {};
}

VariablesHolder.prototype.refresh = function(cb) {
	console.log('refresh begin');
	this.userData.find({}).exec(
		(err, data) => {
			if (err) throw err;

			console.log('a');
			for (var i = 0; i < data.length; i++) {
				this.users[data[i].user] = data[i].data;
			}

			this.serverData.find({}).exec(
				(err, data) => {
					if (err) throw err;

					console.log('b');
					for (var i = 0; i < data.length; i++) {
						this.servers[data[i].server] = data[i].data;
					}

					this.channelData.find({}).exec(
						(err, data) => {
							if (err) throw err;
							
							console.log('c');
							for (var i = 0; i < data.length; i++) {
								this.channels[data[i].channel] = data[i].data;
							}

							console.log('refresh end');
							return cb();
						}
					);
				}
			);
		}
	);
}

VariablesHolder.prototype.setupModels = function(mongoose, cb) {
	console.log('setupModels begin');
	var Schema = mongoose.Schema;

	var TokenSchema = new Schema({
		user: String,
		channel: String,
		token: String
	});
	mongoose.model('Token', TokenSchema);
	this.tokenModel = mongoose.model('Token');

	var UserDataSchema = new Schema({
		user: String,
		data: String
	});
	mongoose.model('UserData', UserDataSchema);
	this.userData = mongoose.model('UserData');

	var ServerDataSchema = new Schema({
		server: String,
		data: String
	});
	mongoose.model('ServerData', ServerDataSchema);
	this.serverData = mongoose.model('ServerData');

	var ChannelDataSchema = new Schema({
		channel: String,
		data: String
	});
	mongoose.model('ChannelData', ChannelDataSchema);
	this.channelData = mongoose.model('ChannelData');
	console.log('setupModels before cb');
	this.refresh(cb);
	console.log('setupModels after cb');
}

module.exports = VariablesHolder;