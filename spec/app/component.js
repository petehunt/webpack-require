'use strict';

var imageUrl = require('./yolo.png');
var stateful = require('./stateful');

module.exports = '<img src="' + imageUrl + '" alt="' + stateful.value + '" />';
