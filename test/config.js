'use strict';
process.env.NODE_ENV = 'test';

var server = require('../server');

var ConfigModule = function () {
    this.baseUrl = 'localhost:8877';
    this.app = server.app;
    this.db = server.db;
    this.mobileUserAgent = 'mobile / Trident / Windows Phone';

};

module.exports = ConfigModule;