'use strict';

var express = require('express');
var router = express.Router();
var SessionHandler = require('../handlers/sessions');
var DeviceHandler = require('../handlers/devices');

module.exports = function (db) {
    var session = new SessionHandler();
    var deviceHandler = new DeviceHandler(db);

    router.get('/cron', session.authenticatedUser, deviceHandler.cron);
    router.get('/notifications', session.authenticatedUser, deviceHandler.cronNotifications);
    router.put('/locate', session.authenticatedUser, deviceHandler.setLocation);
    router.get('/', session.authenticatedUser, deviceHandler.getDevices);
    router.get('/count', session.authenticatedUser, deviceHandler.countDevices);
    router.get('/:id', session.authenticatedUser, deviceHandler.getDevice);
    router.put('/:id', session.authenticatedUser, deviceHandler.updateDevice);
    router.patch('/:id', session.authenticatedUser, deviceHandler.updateStatus); //req.body.status = "active" | "deleted"
    router.post('/getLocations', session.authenticatedUser, deviceHandler.getLocation);
    router.post('/subscribe', session.authenticatedUser, deviceHandler.subscribeDevices);
    router.post('/unsubscribe', session.authenticatedUser, deviceHandler.unsubscribeDevices);

    return router;
};