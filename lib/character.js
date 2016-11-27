const pieces = require('./character-pieces.js');

var types = {
	'5e':         ['actions', 'name', 'hp', 'str', 'dex', 'con', 'int', 'wis', 'cha', 'classes', 'items', 'features', 'proficiencyBonus', '5eac'],
	'pathfinder': ['actions', 'name', 'hp', 'str', 'dex', 'con', 'int', 'wis', 'cha', 'classes', 'items', 'features']
};

function Character(type, name, data) {
	this.type = type;
	this.actions = {};

	if (type in types) {
		var input = types[type];

		for (var i = 0; i < input.length; i++) {
			pieces[input[i]].create(this, data);
		}
	}

	Object.defineProperty(
		this,
		'toString',
		{
			configurable: false,
			enumerable: false,
			writable: false,
			value: () => {
				var ret = 'new Character("' + type + '", "' + name.replace(/"/, '\\"') + '", {';
				var didAThing = false;
				if (type in types) {
					var input = types[type];
					for (var i = 0; i < input.length; i++) {
						var tmp = pieces[input[i]].serialize(this);
						if (tmp) {
							if (didAThing) ret += ',';
							didAThing = true;
							ret += tmp;
						}
					}
				}
				ret += '})';
				return ret;
			}
		}
	);
}

Character.armors = require('./armors.js');
Character.features = require('./character-features.js');

module.exports = Character;