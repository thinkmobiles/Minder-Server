'use strict';

var express = require('express');
var router = express.Router();
var SessionHandler = require('../handlers/sessions');
var SyncHandler = require('../handlers/sync');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

module.exports = function (db) {
    var session = new SessionHandler();
    var syncHandler = new SyncHandler(db);

    router.post('/', session.authenticatedUser, multipartMiddleware, syncHandler.storeFile);
    router.get('/files/:fileName', session.authenticatedUser, syncHandler.getFile);
    router.get('/devices/:id/files', session.authenticatedUser, syncHandler.getFilesByDevice);
    router.get('/devices/:id/files/count', session.authenticatedUser, syncHandler.getFilesCountByDevice);

    return router;
};