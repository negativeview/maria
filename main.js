"use strict";

const StoryDice = require('./lib/story-dice.js');
const configuration = require('./etc/configuration.js');
const Bot = require('discord.io');
const VariablesHolder = require('./lib/variables-holder.js');
const async = require('async');

var storyDice = new StoryDice(configuration);