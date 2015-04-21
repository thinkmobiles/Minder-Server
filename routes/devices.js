'use strict';

var express = require('express');
var router = express.Router();
var SessionHandler = require('../handlers/sessions');
var DeviceHandler = require('../handlers/devices');

module.exports = function (db) {
    'use strict';

    var session = new SessionHandler();
    var deviceHandler = new DeviceHandler(db);

    router.put('/locate', session.authenticatedUser, deviceHandler.setLocation);

    return router;
};