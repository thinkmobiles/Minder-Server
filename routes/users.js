'use strict';

var express = require('express');
var router = express.Router();

var UserHandler = require('../handlers/users');
var SessionHandler = require('../handlers/sessions');

module.exports = function (db) {
    'use strict';
    var userHandler = new UserHandler(db);
    var session = new SessionHandler();

    router.get('/', userHandler.getUsers);
    router.get('/count', userHandler.getUsersCount);

    return router;
};
