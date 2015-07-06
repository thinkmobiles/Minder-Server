'use strict';

var Config = require('./config');
var conf = new Config();

require('../models/index.js');

require ('./testHandlers/users');
require ('./testHandlers/devices');
//require ('./testHelpers/testCostCounter');
//require ('./testHandlers/testSync');