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
    //router.get('/', session.authenticatedUser, deviceHandler.getDevices);
    router.get('/', deviceHandler.getDevices);
    router.get('/count', deviceHandler.countDevices);
    router.get('/:id', deviceHandler.getDevice);
    router.put('/:id', deviceHandler.updateDevice);
    return router;
};