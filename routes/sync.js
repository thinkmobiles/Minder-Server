'use strict';

var express = require('express');
var router = express.Router();
var SessionHandler = require('../handlers/sessions');
var SyncHandler = require('../handlers/sync');

module.exports = function (db) {
    var session = new SessionHandler();
    var syncHandler = new SyncHandler(db);

    router.post('/', session.authenticatedUser, syncHandler.storeFile);
    router.get('/files/:fileName', session.authenticatedUser, syncHandler.getFile);

    return router;
};