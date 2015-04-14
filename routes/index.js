'use strict';

module.exports = function (app, mainDb) {
    var RESPONSES = require('../constants/responses');

    var fs = require("fs");
    var logWriter = require('../helpers/logWriter')();
    var mongoose = mainDb.mongoose;

    var multipart = require('connect-multiparty');
    var multipartMiddleware = multipart();

    app.get('/', function (req, res, next) {
        //res.sendfile('index.html');
        res.send('Ok');
    });

    // ----------------------------------------------------------
    // Error Handler:
    // ----------------------------------------------------------
    function notFound (req, res, next) {
        res.status(404);

        if (req.accepts('html')) {
            return res.send(RESPONSES.PAGE_NOT_FOUND);
        }

        if (req.accepts('json')) {
            return res.json({error: RESPONSES.PAGE_NOT_FOUND});
        }

        res.type('txt');
        res.send(RESPONSES.PAGE_NOT_FOUND);
    };

    function errorHandler (err, req, res, next) {
        var status = err.status || 500;

        if (process.env.NODE_ENV === 'production') {
            if (status === 401) {
                logWriter.log('', err.message + '\n' + err.stack);
            }
            res.status(status).send({error: err.message});
        } else {
            if (status !== 401) {
                logWriter.log('', err.message + '\n' + err.stack);
            }
            res.status(status).send({error: err.message + '\n' + err.stack});
        }
    };

    app.use(notFound);
    app.use(errorHandler);
};