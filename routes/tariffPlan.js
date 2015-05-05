'use strict';

var express = require('express');
var router = express.Router();

var TariffPlanHandler = require('../handlers/tariffPlan');
var SessionHandler = require('../handlers/sessions');

module.exports = function (db) {
    'use strict';
    var tariffPlan = new TariffPlanHandler(db);
    var session = new SessionHandler(db);

    router.get('/', session.authenticatedUser, tariffPlan.getTariffPans);
    router.post('/subscribe', session.authenticatedUser, tariffPlan.subscribe);
    //router.get('/getStripeTariffs', session.authenticatedUser, tariffPlan.getStripeTariffs);
    //router.get('/getStripeCustomers', session.authenticatedUser, tariffPlan.getStripeCustomers);

    return router;
};
