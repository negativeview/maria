module.exports = {
	"Padded": {
		name: "Padded Armor",
		baseAC: function(character, baseAC) {
			var dex = character.dexMod;
			return 11 + dex;
		}
	},
	"Leather": {
		name: "Leather Armor",
		baseAC: function(character, baseAC) {
			var dex = character.dexMod;
			return 11 + dex;
		}
	},
	"Studded Leather": {
		name: "Studded Leather Armor",
		baseAC: function(character, baseAC) {
			var dex = character.dexMod;
			return 12 + dex;
		}
	},
	"Hide": {
		name: "Hide Armor",
		baseAC: function(character, baseAC) {
			var dex = character.dexMod;
			if (dex > 2) dex = 2;
			return 12 + dex;
		}
	},
	"Chain Shirt": {
		name: "Chain Shirt",
		baseAC: function(character, baseAC) {
			var dex = character.dexMod;
			if (dex > 2) dex = 2;
			return 13 + dex;
		}
	},
	"Scale Mail": {
		name: "Scale Mail",
		baseAC: function(character, baseAC) {
			var dex = character.dexMod;
			if (dex > 2) dex = 2;
			return 14 + dex;
		}
	},
	"Breastplate": {
		name: "Breastplate",
		baseAC: function(character, baseAC) {
			var dex = character.dexMod;
			if (dex > 2) dex = 2;
			return 14 + dex;
		}
	},
	"Half Plate": {
		name: "Breastplate",
		baseAC: function(character, baseAC) {
			var dex = character.dexMod;
			if (dex > 2) dex = 2;
			return 15 + dex;
		}
	},
	"Ring Mail": {
		name: "Ring Mail",
		baseAC: function(character, baseAC) {
			return 14;
		}
	},
	"Chain Mail": {
		name: "Chain Mail",
		baseAC: function(character, baseAC) {
			return 16;
		}
	},
	"Splint": {
		name: "Splint Armor",
		baseAC: function(character, baseAC) {
			return 17;
		}
	},
	"Plate": {
		name: "Plate Armor",
		baseAC: function(character, baseAC) {
			return 18;
		}
	},
	"Shield": {
		name: "Shield",
		acBonus: function(character, acBonus) {
			return acBonus + 2;
		}
	}
};