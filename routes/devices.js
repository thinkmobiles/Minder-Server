'use strict';

var express = require('express');
var router = express.Router();
var SessionHandler = require('../handlers/sessions');
var DeviceHandler = require('../handlers/devices');

module.exports = function (db) {
    var session = new SessionHandler();
    var deviceHandler = new DeviceHandler(db);

    router.put('/locate', session.authenticatedUser, deviceHandler.setLocation);
    router.get('/', deviceHandler.getDevices);
    router.get('/count', deviceHandler.countDevices);
    router.get('/:id', deviceHandler.getDevice);
    router.put('/:id', deviceHandler.updateDevice);
    //router.delete('/:id', deviceHandler.removeDevice);
    router.patch('/:id', deviceHandler.updateStatus); //req.body.status = "active" | "deleted"
    router.post('/getLocations', deviceHandler.getLocation);
    router.post('/subscribe', deviceHandler.subscribeDevices);
    router.post('/unsubscribe', deviceHandler.unsubscribeDevices);

    return router;
};