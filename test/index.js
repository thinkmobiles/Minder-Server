'use strict';

var Config = require('./config');
var conf = new Config();

require ('./testHandlers/users');
require ('./testHandlers/devices');