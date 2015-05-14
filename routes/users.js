'use strict';

var express = require('express');
var router = express.Router();

var UserHandler = require('../handlers/users');
var SessionHandler = require('../handlers/sessions');

module.exports = function (db) {
    'use strict';
    var userHandler = new UserHandler(db);
    var session = new SessionHandler();

    /*router.get('/', session.authenticatedAdmin, userHandler.getUsers);
    router.get('/count', userHandler.getUsersCount);
    router.get('/:id', userHandler.getUser);
    router.put('/:id', session.authenticatedAdmin, userHandler.updateUser);*/

    return router;
};
