'use strict';

var express = require('express');
var router = express.Router();
var SessionHandler = require('../handlers/sessions');
var DeviceHandler = require('../handlers/devices');

module.exports = function (db) {
    var session = new SessionHandler();
    var deviceHandler = new DeviceHandler(db);

    router.get('/cron', session.authenticatedUser, deviceHandler.testCronJobForCheckExpirationDates);                       //TODO: use for tests
    router.get('/notifications', session.authenticatedUser, deviceHandler.testCronJobForNotifications); //TODO: use for tests

    router.put('/locate', session.authenticatedUser, deviceHandler.setLocation);
    router.get('/', session.authenticatedUser, deviceHandler.getDevices);
    router.get('/count', session.authenticatedUser, deviceHandler.countDevices);
    router.get('/:id', session.authenticatedUser, deviceHandler.getDevice);
    router.put('/:id', session.authenticatedUser, deviceHandler.updateDevice);
    router.patch('/:id', session.authenticatedUser, deviceHandler.updateStatus); //req.body.status = "active" | "deleted"
    router.put('/:id/geoFence', session.authenticatedUser, deviceHandler.updateGeoFence);
    router.post('/:id/geoFence/subscribe', session.authenticatedUser, deviceHandler.subscribeGeoFence);
    router.post('/:id/geoFence/unsubscribe', session.authenticatedUser, deviceHandler.unsubscribeGeoFence);
    router.post('/getLocations', session.authenticatedUser, deviceHandler.getLocation);
    router.post('/subscribe', session.authenticatedUser, deviceHandler.subscribeDevices);
    router.post('/unsubscribe', session.authenticatedUser, deviceHandler.unsubscribeDevices);

    return router;
};