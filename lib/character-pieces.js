/**
 * The character sheet is comprised of multiple modules. This file collects all
 * of the modules that may or may be not used in any individual character
 * sheet.
 *
 * The modules can define the following functions:
 *
 *     serialize: This function is responsible for serialization of the modules
 *                data into a form that can be stored in mongodb.
 *
 *     create: This function defines the appropriate properties on the
 *             character sheet itself. Note that we want to use
 *             Object.defineProperty here because we likely want the property
 *             to be non-configurable.
 */

const Dice = require('./dice.js');

module.exports = {
	'name': {
		serialize: function(item) {
			return 'name: ' + JSON.stringify(item.name);			
		},
		create: function(item, data) {
			Object.defineProperty(
				item,
				'name',
				{
					configurable: false,
					enumerable: true,
					value: data ? data.name : '',
					writable: true
				}
			);
		}
	},
	'actions': {
		serialize: function(item) {
			var r = 'actions: {';
			var keys = Object.keys(item.actions);
			for (var i = 0; i < keys.length; i++) {
				if (i != 0) r += ',';
				var thing = item.actions[keys[i]];
				switch (typeof(thing)) {
					case 'string':
						r += keys[i] + ': "' + thing.replace(/"/g, '\\"') + '"';
						break;
					case 'number':
						r += keys[i] + ': ' + thing;
						break;
					case 'boolean':
						r += keys[i] + ': ' + (thing ? 'true' : 'false');
						break;
					case 'function':
						r += keys[i] + ': ' + thing.toString();
						break;
					default:
						//console.log('typeof', keys[i], typeof(thing));
				}
			}
			r += '}';
			return r;
		},
		create: function(item, data) {
			Object.defineProperty(
				item,
				'actions',
				{
					configurable: false,
					enumerable: true,
					value: data ? (data.actions ? data.actions : {}) : {},
					writable: true
				}
			);
		}
	},
	'classes': {
		serialize: function(item) {
			return 'classes: ' + JSON.stringify(item.classes);
		},
		create: function(item, data) {
			Object.defineProperty(
				item,
				'classes',
				{
					configurable: false,
					enumerable: true,
					value: data ? data.classes : [],
					writable: true
				}
			);
		}
	},
	'proficiencyBonus': {
		serialize: function(item) {
			return null;
		},
		create: function(item, data) {
			Object.defineProperty(
				item,
				'proficiencyBonus',
				{
					configurable: false,
					enumerable: true,
					get: function() {
						var base = 0;
						if (this.classes && Object.keys(this.classes).length > 0) {
							base = 2 + Math.floor((Object.keys(this.classes).length - 1) / 4);
						}

						if ('items' in this && this.items) {
							for (var i = 0; i < this.items.length; i++) {
								var item2 = this.items[i];
								// Skip items that are disabled.
								if (('enabled' in item2) && !item2.enabled) {
									continue;
								}

								if ('proficiencyBonus' in item2) {
									base = item2.proficiencyBonus(item, base);
								}
							}
						}
						if ('features' in this && this.features) {
							for (var i = 0; i < this.features.length; i++) {
								var item2 = this.features[i];
								// Skip items that are disabled.
								if (('enabled' in item2) && !item2.enabled) {
									continue;
								}

								// Able to modify Armor Class
								if ('proficiencyBonus' in item2) {
									base = item2.proficiencyBonus(item, base);
								}
							}							
						}
						return base;
					},
					set: function() {
						return false;
					}
				}
			);
		}
	},
	'hp': {
		serialize: function(item) {
			return 'hp: ' + JSON.stringify(item.hp) + ', maxHP: ' + JSON.stringify(item.maxHP);
		},
		create: function(item, data) {
			Object.defineProperty(
				item,
				'hp',
				{
					configurable: false,
					enumerable: true,
					value: data ? data.hp : 0,
					writable: true
				}
			);
			Object.defineProperty(
				item,
				'maxHP',
				{
					configurable: false,
					enumerable: true,
					value: data ? data.maxHP : 0,
					writable: true
				}
			);
		}
	},
	'str': {
		serialize: function(item) {
			return 'str: ' + JSON.stringify(item.str);
		},
		create: function(item, data) {
			Object.defineProperty(
				item.actions,
				'str',
				{
					configurable: false,
					enumerable: false,
					value: (function() {
						var dice = new Dice();
						var res = dice.handle(null, null, ['', '1d20 + ' + this.strMod], () => {});
						process.send(
							{
								type: 'echo',
								string: res.string
							}
						);
					}).bind(item),
					writable: false
				}
			);
			Object.defineProperty(
				item,
				'str',
				{
					configurable: false,
					enumerable: true,
					value: data ? data.str : 10,
					writable: true
				}
			);
			Object.defineProperty(
				item,
				'strMod',
				{
					configurable: false,
					enumerable: true,
					get: function() {
						return Math.floor((this.str - 10) / 2);
					},
					set: function() {
						return false;
					}
				}
			);
		}
	},
	'dex': {
		serialize: function(item) {
			return 'dex: ' + JSON.stringify(item.dex);
		},
		create: function(item, data) {
			Object.defineProperty(
				item.actions,
				'dex',
				{
					configurable: false,
					enumerable: false,
					value: (function() {
						var dice = new Dice();
						var res = dice.handle(null, null, ['', '1d20 + ' + this.dexMod], () => {});
						return res.string;
					}).bind(item),
					writable: false
				}
			);
			Object.defineProperty(
				item,
				'dex',
				{
					configurable: false,
					enumerable: true,
					value: data ? data.dex : 10,
					writable: true
				}
			);
			Object.defineProperty(
				item,
				'dexMod',
				{
					configurable: false,
					enumerable: true,
					get: function() {
						return Math.floor((this.dex - 10) / 2);
					},
					set: function() {
						return false;
					}
				}
			);
		}
	},
	'con': {
		serialize: function(item) {
			return 'con: ' + JSON.stringify(item.con);
		},
		create: function(item, data) {
			Object.defineProperty(
				item.actions,
				'con',
				{
					configurable: false,
					enumerable: false,
					value: (function() {
						var dice = new Dice();
						var res = dice.handle(null, null, ['', '1d20 + ' + this.conMod], () => {});
						return res.string;
					}).bind(item),
					writable: false
				}
			);
			Object.defineProperty(
				item,
				'con',
				{
					configurable: false,
					enumerable: true,
					value: data ? data.con : 10,
					writable: true
				}
			);
			Object.defineProperty(
				item,
				'conMod',
				{
					configurable: false,
					enumerable: true,
					get: function() {
						return Math.floor((this.con - 10) / 2);
					},
					set: function() {
						return false;
					}
				}
			);
		}
	},
	'int': {
		serialize: function(item) {
			return 'int: ' + JSON.stringify(item.int);
		},
		create: function(item, data) {
			Object.defineProperty(
				item.actions,
				'int',
				{
					configurable: false,
					enumerable: false,
					value: (function() {
						var dice = new Dice();
						var res = dice.handle(null, null, ['', '1d20 + ' + this.intMod], () => {});
						return res.string;
					}).bind(item),
					writable: false
				}
			);
			Object.defineProperty(
				item,
				'int',
				{
					configurable: false,
					enumerable: true,
					value: data ? data.int : 10,
					writable: true
				}
			);
			Object.defineProperty(
				item,
				'intMod',
				{
					configurable: false,
					enumerable: true,
					get: function() {
						return Math.floor((this.int - 10) / 2);
					},
					set: function() {
						return false;
					}
				}
			);
		}
	},
	'wis': {
		serialize: function(item) {
			return 'wis: ' + JSON.stringify(item.wis);
		},
		create: function(item, data) {
			Object.defineProperty(
				item.actions,
				'wis',
				{
					configurable: false,
					enumerable: false,
					value: (function() {
						var dice = new Dice();
						var res = dice.handle(null, null, ['', '1d20 + ' + this.wisMod], () => {});
						return res.string;
					}).bind(item),
					writable: false
				}
			);
			Object.defineProperty(
				item,
				'wis',
				{
					configurable: false,
					enumerable: true,
					value: data ? data.wis : 10,
					writable: true
				}
			);
			Object.defineProperty(
				item,
				'wisMod',
				{
					configurable: false,
					enumerable: true,
					get: function() {
						return Math.floor((this.wis - 10) / 2);
					},
					set: function() {
						return false;
					}
				}
			);
		}
	},
	'cha': {
		serialize: function(item) {
			return 'cha: ' + JSON.stringify(item.cha);
		},
		create: function(item, data) {
			Object.defineProperty(
				item.actions,
				'cha',
				{
					configurable: false,
					enumerable: false,
					value: (function() {
						var dice = new Dice();
						var res = dice.handle(null, null, ['', '1d20 + ' + this.chaMod], () => {});
						return res.string;
					}).bind(item),
					writable: false
				}
			);
			Object.defineProperty(
				item,
				'cha',
				{
					configurable: false,
					enumerable: true,
					value: data ? data.cha : 10,
					writable: true
				}
			);
			Object.defineProperty(
				item,
				'chaMod',
				{
					configurable: false,
					enumerable: true,
					get: function() {
						return Math.floor((this.cha - 10) / 2);
					},
					set: function() {
						return false;
					}
				}
			);
		}
	},
	/**
	 * NOTE: data.items will likely have functions, so need to serialize/hydrate differently.
	 */
	'items': {
		serialize: function(item) {
			var r = 'items: [';
			if ('items' in item) {
				if (item.items) {
					for (var i = 0; i < item.items.length; i++) {
						if (i != 0) r += ',';
						r += '{';
						var keys = Object.getOwnPropertyNames(item.items[i]);
						for (var m = 0; m < keys.length; m++) {
							if (m != 0) r += ',';
							var thing = item.items[i][keys[m]];
							switch (typeof(thing)) {
								case 'string':
									r += keys[m] + ': "' + thing.replace(/"/g, '\\"') + '"';
									break;
								case 'number':
									r += keys[m] + ': ' + thing;
									break;
								case 'function':
									r += keys[m] + ': ' + thing.toString();
									break;
								case 'boolean':
									r += keys[m] + ': ' + (thing ? 'true' : 'false');
									break;
								default:
									console.log('typeof', keys[m], typeof(thing));
							}
						}
						r += '}';
					}
				}
			}
			r += ']';
			return r;
		},
		create: function(item, data) {
			Object.defineProperty(
				item,
				'items',
				{
					configurable: false,
					enumerable: true,
					value: data ? data.items : [],
					writable: true
				}
			);
		}
	},
	'features': {
		serialize: function(item) {
			var r = 'features: [';
			if ('items' in item) {
				if (item.items) {
					for (var i = 0; i < item.features.length; i++) {
						if (i != 0) r += ',';
						r += '{';
						var keys = Object.getOwnPropertyNames(item.features[i]);
						for (var m = 0; m < keys.length; m++) {
							if (m != 0) r += ',';
							var thing = item.features[i][keys[m]];
							switch (typeof(thing)) {
								case 'string':
									r += keys[m] + ': "' + thing.replace(/"/g, '\\"') + '"';
									break;
								case 'number':
									r += keys[m] + ': ' + thing;
									break;
								case 'function':
									r += keys[m] + ': ' + thing.toString();
									break;
								case 'boolean':
									r += keys[m] + ': ' + (thing ? 'true' : 'false');
									break;
								default:
									console.log('typeof', keys[m], typeof(thing));
							}
						}
						r += '}';
					}
				}
			}
			r += ']';
			return r;
		},
		create: function(item, data) {
			Object.defineProperty(
				item,
				'features',
				{
					configurable: false,
					enumerable: true,
					value: data ? data.features : [],
					writable: true
				}
			);
		}
	},
	'5eac': {
		serialize: function(item) {
			return null;
		},
		create: function(item, data) {
			Object.defineProperty(
				item,
				'ac',
				{
					configurable: false,
					enumerable: true,
					get: function() {
						var baseAC = 10 + this.dexMod;
						var acBonus = 0;

						if ('items' in this && this.items) {
							for (var i = 0; i < this.items.length; i++) {
								var item2 = this.items[i];
								// Skip items that are disabled.
								if (('enabled' in item2) && !item2.enabled) {
									continue;
								}

								// Able to modify Armor Class
								if ('baseAC' in item2) {
									baseAC = item2.baseAC(item, baseAC);
								}
								if ('acBonus' in item2) {
									acBonus = item2.acBonus(item, acBonus);
								}
							}
						}
						if ('features' in this && this.features) {
							for (var i = 0; i < this.features.length; i++) {
								var item2 = this.features[i];
								// Skip items that are disabled.
								if (('enabled' in item2) && !item2.enabled) {
									continue;
								}

								// Able to modify Armor Class
								if ('baseAC' in item2) {
									baseAC = item2.baseAC(item, baseAC);
								}
								if ('acBonus' in item2) {
									acBonus = item2.acBonus(item, acBonus);
								}
							}							
						}
						return baseAC + acBonus;
					},
					set: function() {
						return false;
					}
				}
			);
		}
	}
};