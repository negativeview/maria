"use strict";

const lexer = require('lex');

function Dice() {

}

Dice.prototype.applyModifiers = function(tokens) {
	// Put modifiers to a die roll into the actual die token.
	var lastDie = -1;
	var lastDieOrNumber = -1;

	for (var i = 0; i < tokens.length; i++) {
		var token = tokens[i];
		switch (token.type) {
			case 'number':
				lastDieOrNumber = i;
				break;
			case 'die':
				lastDie = i;
				lastDieOrNumber = i;
				break;
			case 'ro<':
				if (lastDie == -1) {
					throw 'Cannot ro< without a die roll.';
				}
				tokens[lastDie].roLess = token.num;
				break;
			case 'r<':
				if (lastDie == -1) {
					throw 'Cannot r< without a die roll.';
				}
				tokens[lastDie].rLess = token.num;
				break;
			case 'exploding':
				if (lastDie == -1) {
					throw 'Cannot set exploding without a die roll.';
				}
				tokens[lastDie].exploding = true;
				break;
			case 'keep-high':
				if (lastDie == -1) {
					throw 'Cannot set keep-high without a die roll.';
				}

				tokens[lastDie].keep = token.num;
				tokens[lastDie].keepType = 'high';
				break;
			case 'comment':
				if (lastDieOrNumber == -1) {
					//throw 'To set a comment, you need either a die or a number.';
				} else {
					tokens[lastDieOrNumber].comment = token.comment;
				}
				break;
			case 'keep-low':
				if (lastDie == -1) {
					throw 'Cannot set keep-high without a die roll.';
				}

				tokens[lastDie].keep = token.num;
				tokens[lastDie].keepType = 'low';
				break;
		}
	}

	// Copy tokens that are still relevant.
	var newTokens = [];
	for (var i = 0; i < tokens.length; i++) {
		var token = tokens[i];
		switch (token.type) {
			case 'number':
			case 'die':
			case '+':
			case '-':
				newTokens.push(token);
				break;
		}
	}

	return newTokens;
}

Dice.prototype.doInitialRoll = function(numDice, faces, rerollLess, numRerolls, exploding) {
	var results = [];

	for (var i = 0; i < numDice; i++) {
		var thisResult = {
			rolls: [],
			keptValue: 0,
			kept: true
		};

		var rerolls = 0;
		var totalRolls = 0;

		while (true) {
			totalRolls++;
			if (totalRolls > 100) break;

			var max = faces;
			var min = 1;
			var result = Math.floor(Math.random() * (max - min + 1)) + min;

			if (result < rerollLess && rerolls < numRerolls) {
				rerolls++;
				thisResult.rolls[thisResult.rolls.length] = {
					result: result,
					kept: false
				};
			} else {
				thisResult.rolls[thisResult.rolls.length] = {
					result: result,
					kept: true
				};
				thisResult.keptValue += result;

				if (exploding && result == faces) {
					// Just continue going, we exploded
				} else {
					break;
				}
			}
		}

		results[results.length] = thisResult;
	}

	return results;
}

Dice.prototype.doDiceRolling = function(tokens) {
	for (var i = 0; i < tokens.length; i++) {
		var token = tokens[i];
		switch (token.type) {
			case 'die':
				var pieces = token.lexeme.match(/(\d+)d(\d+)/i);
				var dice = pieces[1];
				var faces = pieces[2];

				var tmpResult = [];
				var stringified = token.lexeme;

				if (token.exploding) stringified += '!';

				if (token.roLess) {
					stringified += 'ro<' + token.roLess;
					tmpResult = this.doInitialRoll(dice, faces, token.roLess, 1, !!token.exploding);
				} else if (token.rLess) {
					stringified += 'r<' + token.rLess;
					tmpResult = this.doInitialRoll(dice, faces, token.rLess, 20, !!token.exploding);
				} else {
					tmpResult = this.doInitialRoll(dice, faces, 0, 1, !!token.exploding);
				}

				if (token.keep) {
					var toRemove = tmpResult.length - token.keep;
					if (toRemove > 0) {
						if (token.keepType == 'high') {
							stringified += 'kh' + token.keep;
							while (toRemove > 0) {
								var lowest = -1;
								for (var m = 0; m < tmpResult.length; m++) {
									if (
										tmpResult[m].kept == true &&
										(lowest == -1 || tmpResult[m].keptValue < tmpResult[lowest].keptValue)
									) {
										lowest = m;
									}
								}

								if (lowest == -1) break;

								tmpResult[lowest].kept = false;
								toRemove--;
							}
						} else if (token.keepType == 'low') {
							stringified += 'kl' + token.keep;
							while (toRemove > 0) {
								var highest = -1;
								for (var m = 0; m < tmpResult.length; m++) {
									if (
										tmpResult[m].kept == true &&
										(highest == -1 || tmpResult[m].keptValue > tmpResult[highest].keptValue)
									) {
										highest = m;
									}
								}

								if (highest == -1) break;
								
								tmpResult[highest].kept = false;
								toRemove--;
							}
						}
					}
				}

				tokens[i] = {
					type: 'die',
					number: token.number,
					dieSize: token.dieSize,
					exploding: token.exploding ? true : false,
					comment: token.comment,
					string: stringified,
					rolls: tmpResult
				};
				break;
		}
	}

	return tokens;
}

Dice.prototype.getFinalValue = function(tokens) {
	var finalFinalValue = 0;
	var mode = '+';

	for (var i = 0; i < tokens.length; i++) {
		var token = tokens[i];
		switch(token.type) {
			case 'die':
				var finalValue = 0;

				for (var m = 0; m < token.rolls.length; m++) {
					var roll = token.rolls[m];
					var overrideKeep = !roll.kept;

					for (var p = 0; p < roll.rolls.length; p++) {
						var roll2 = roll.rolls[p];
						if (!roll2.kept || overrideKeep) {
						} else {
							finalValue += roll2.result;
						}
					}
				}

				if (mode == '+') {
					finalFinalValue += finalValue;
				} else {
					finalFinalValue -= finalValue;
				}
				break;
			case '+':
			case '-':
				mode = token.type;
				break;
			case 'number':
				if (mode == '+') {
					finalFinalValue += parseInt(token.lexeme);
				} else {
					finalFinalValue -= parseInt(token.lexeme);
				}
				break;
			default:
				console.log(token);
				break;
		}
	}

	return finalFinalValue;
}

Dice.prototype.formatDiceResultOrdered = function(tokens) {
	var str = '';
	var finalFinalValue = 0;
	var mode = '+';

	for (var i = 0; i < tokens.length; i++) {
		var token = tokens[i];
		switch(token.type) {
			case 'die':
				str += token.string;
				str += ' (';
				var finalValue = 0;
				var inStrike = false;

				var rolls = [];

				for (var m = 0; m < token.rolls.length; m++) {
					var roll = token.rolls[m];
					rolls.push(roll);
				};

				rolls.sort(function(a, b) {
					return a.keptValue - b.keptValue;
				});

				for (var m = 0; m < rolls.length; m++) {
					var roll = rolls[m];
					var overrideKeep = !roll.kept;

					for (var p = 0; p < roll.rolls.length; p++) {
						var roll2 = roll.rolls[p];
						if (!roll2.kept || overrideKeep) {
							if (m > 0 || p > 0) {
								str += ', ';
							}

							if (!inStrike) {
								str += '~~';
								inStrike = true;
							}

							str += roll2.result;
						} else {
							if (inStrike) {
								str += '~~';
								inStrike = false;
							}

							if (m > 0 || p > 0) {
								str += ', ';
							}

							if (roll2.result == 1 || roll2.result == token.dieSize) {
								str += '**' + roll2.result + '**';
							} else {
								str += roll2.result;
							}
							finalValue += roll2.result;
						}
					}
				}

				if (inStrike) {
					str += '~~';
				}

				str += ')';

				if (token.comment) {
					str += ' [' + token.comment + ']';
				}
				if (mode == '+') {
					finalFinalValue += finalValue;
				} else {
					finalFinalValue -= finalValue;
				}
				break;
			case '+':
			case '-':
				mode = token.type;
				str += ' ' + token.type + ' ';
				break;
			case 'number':
				if (mode == '+') {
					finalFinalValue += parseInt(token.lexeme);
				} else {
					finalFinalValue -= parseInt(token.lexeme);
				}
				str += token.lexeme;
				if (token.comment) {
					str += ' [' + token.comment + ']';
				}
				break;
			default:
				console.log(token);
				break;
		}
	}

	str += ' = `' + finalFinalValue + '`';

	return str;	
}

Dice.prototype.formatDiceResult = function(tokens) {
	var str = '';

	var finalFinalValue = 0;
	var mode = '+';

	for (var i = 0; i < tokens.length; i++) {
		var token = tokens[i];
		switch(token.type) {
			case 'die':
				str += token.string;
				str += ' (';
				var finalValue = 0;
				var inStrike = false;

				for (var m = 0; m < token.rolls.length; m++) {
					var roll = token.rolls[m];
					var overrideKeep = !roll.kept;

					for (var p = 0; p < roll.rolls.length; p++) {
						var roll2 = roll.rolls[p];
						if (!roll2.kept || overrideKeep) {
							if (m > 0 || p > 0) {
								str += ', ';
							}

							if (!inStrike) {
								str += '~~';
								inStrike = true;
							}

							str += roll2.result;
						} else {
							if (inStrike) {
								str += '~~';
								inStrike = false;
							}

							if (m > 0 || p > 0) {
								str += ', ';
							}

							if (roll2.result == 1 || roll2.result == token.dieSize) {
								str += '**' + roll2.result + '**';
							} else {
								str += roll2.result;
							}
							finalValue += roll2.result;
						}
					}
				}

				if (inStrike) {
					str += '~~';
				}

				str += ')';

				if (token.comment) {
					str += ' [' + token.comment + ']';
				}
				if (mode == '+') {
					finalFinalValue += finalValue;
				} else {
					finalFinalValue -= finalValue;
				}
				break;
			case '+':
			case '-':
				mode = token.type;
				str += ' ' + token.type + ' ';
				break;
			case 'number':
				if (mode == '+') {
					finalFinalValue += parseInt(token.lexeme);
				} else {
					finalFinalValue -= parseInt(token.lexeme);
				}
				str += token.lexeme;
				if (token.comment) {
					str += ' [' + token.comment + ']';
				}
				break;
			default:
				console.log(token);
				break;
		}
	}

	str += ' = `' + finalFinalValue + '`';

	return str;
}

Dice.prototype.handle = function(messageHandler, variablesHolder, pieces, cb) {
	var input = '';
	for (var i = 1; i < pieces.length; i++) {
		input += pieces[i] + ' ';
	}

	if (input.indexOf('100d2') !== -1 && Math.random() < 0.25) {
		cb(
			[
				{
					success: true,
					message: "I tire of this game.",
					destination: 'channel',
					validated: true,
					destinationOverrideable: true
				}
			]
		);
		return;
	}

	var lex = new lexer();
	var tokens = [];

	lex.addRule(/\+\-/, function (lexeme) {
		tokens.push({
			type: '-',
			lexeme: '-'
		});
	});
	lex.addRule(/\-/, function(lexeme) {
		tokens.push({
			type: '-',
			lexeme: lexeme
		});
	});
	lex.addRule(/\[([^\]]+)\]/, function(lexeme, comment) {
		tokens.push({
			type: 'comment',
			lexeme: lexeme,
			comment: comment
		});
	});
	lex.addRule(/[ \n\t\r]/, function(lexeme) {
		// Ignore spaces.
	});
	lex.addRule(/ro<(\d+)/, function(lexeme, num) {
		tokens.push({
			type: 'ro<',
			lexeme: lexeme,
			num: num
		});
	});
	lex.addRule(/r<(\d+)/, function(lexeme, num) {
		tokens.push({
			type: 'r<',
			lexeme: lexeme,
			num: num
		});
	});
	lex.addRule(/(\d+)d(\d+)/i, function(lexeme, num, size) {
		tokens.push({
			type: 'die',
			lexeme: lexeme,
			number: num,
			dieSize: size
		});
	});
	lex.addRule(/\-H/, function(lexeme) {
		tokens.push({
			type: 'keep-high',
			num: 1,
			lexeme: lexeme
		});
	});
	lex.addRule(/\!/, function(lexeme) {
		tokens.push({
			type: 'exploding',
			lexeme: lexeme
		});
	});
	lex.addRule(/simple/, function(lexeme) {
		isSimple = true;
	});
	lex.addRule(/plain/, function(lexeme) {
		isPlain = true;
	});
	lex.addRule(/kh(\d+)/, function(lexeme) {
		var matches = lexeme.match(/kh(\d+)/);
		var num = matches[1];

		tokens.push({
			type: 'keep-high',
			lexeme: lexeme,
			num: num
		});
	});
	lex.addRule(/kl(\d+)/, function(lexeme) {
		var matches = lexeme.match(/kl(\d+)/);
		var num = matches[1];

		tokens.push({
			type: 'keep-low',
			lexeme: lexeme,
			num: num
		});
	})
	lex.addRule(/[\(\)]/, function(lexeme) {
	});
	lex.addRule(/\-L/, function(lexeme) {
		tokens.push({
			type: 'keep-low',
			num: 1
		});
	});
	lex.addRule(/\+/, function(lexeme) {
		tokens.push({
			type: '+',
			lexeme: lexeme
		});
	});
	lex.addRule(/(\d+)/, function(lexeme) {
		tokens.push({
			type: 'number',
			lexeme: lexeme
		});
	});
	lex.setInput(input);
	try {
		lex.lex();
	} catch (e) {
		return cb(
			[
				{
					success: false,
					message: e.toString(),
					destination: 'user',
					validated: true,
					destinationOverrideable: true
				}
			]
		);
	}

	tokens = this.applyModifiers(tokens);
	tokens = this.doDiceRolling(tokens);

	cb(
		[
			{
				success: true,
				message: this.formatDiceResult(tokens),
				raw: tokens,
				destination: 'channel',
				validated: true,
				destinationOverrideable: true
			}
		]
	);

	var ret = {
		tokens: tokens
	};
	ret.string = this.formatDiceResult(tokens);
	ret.ordered = this.formatDiceResultOrdered(tokens);
	ret.plain = this.getFinalValue(tokens);
	ret.simple = '`' + ret.plain + '`';
	return ret;
}

module.exports = Dice;
