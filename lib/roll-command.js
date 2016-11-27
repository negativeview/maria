"use strict"

const Dice = require('maria-dice');

class RollCommand {
	handle(command, commandResult, cb) {
		var idx = command.indexOf(' ');
		if (idx == -1) return cb();

		var dieCommand = command.substr(idx + 1);

		var rollParser = new Dice.RollParser();
		try {
			var rollInput = rollParser.parse(dieCommand);
			rollInput.execute();

			commandResult.output.push(
				{
					type: 'roll',
					verified: true,
					stringified: this.stringify(rollInput.result)
				}
			);
		} catch(e) {
			commandResult.output.push(
				{
					type: 'exception',
					verified: true,
					stringified: e.toString()
				}
			);
		}

		return cb();
	}

	stringifyItem(item) {
		switch(item.type) {
			case 'symbol':
				if (item.symbol == '+') {
					this.negativeStatus = 0;
				} else if (item.symbol == '-') {
					this.negativeStatus = 1;
				}
				return item.symbol;
			case 'raw-number':
				var r = '';
				if (item.rejected) {
					r += '~~';
				}
				if (!item.rejected) {
					if (this.negativeStatus == 0) {
						this.total += item.numericValue;
					} else {
						this.total -= item.numericValue;
					}
				}
				r += item.numericValue;
				if (item.rejected) {
					r += '~~';
				}
				return r;
			case 'group':
				var r = '{';
				r += item.children.map(
					(item) => {
						return this.stringifyItem(item);
					}
				);
				r += '}';
				if (item.configuration.keep) {
					r += 'k';
					if (item.configuration.keepLow) {
						r += 'l';
					} else {
						r += 'h';
					}
					r += item.configuration.keep;
				}
				return r;
			case 'roll-group':
				var r = '';
				if (item.rejected) {
					r += '~~';
				}
				r += item.configuration.number + 'd' + item.configuration.size;
				if (item.configuration.exploding) {
					r += '!';
				}

				if (item.configuration.keep) {
					if (item.configuration.keepLow) {
						r += 'kl';
					} else {
						r += 'kh';
					}
					r += item.configuration.keep;
				}

				if (item.configuration.reroll.enabled) {
					r += 'r';
					if (item.configuration.reroll.max == 1) {
						r += 'o';
					}
					r += '<' + item.configuration.reroll.breakpoint;
				}
				r += ' (';

				r += item.rolls.map(
					(item) => {
						if (item.rejected) return '~~' + item.result + '~~';
						return item.result;
					}
				).join(', ');

				r += ')';
				if (item.rejected) {
					r += '~~';
				}

				if (!item.rejected) {
					if (this.negativeStatus == 0) {
						this.total += item.numericValue;
					} else {
						this.total -= item.numericValue;
					}
				}
				return r;
		}

	}

	stringify(result) {
		this.total = 0;
		this.negativeStatus = 0;

		var ret = '';
		ret += result.resultParts.map(
			(item) => {
				return this.stringifyItem(item);
			}
		).join(' ');

		ret += ' = ' + this.total;

		return ret;
	}
}

module.exports = RollCommand;