'use strict';

var express = require('express');
var router = express.Router();
var SessionHandler = require('../handlers/sessions');
var PlansHandler = require('../handlers/tariffPlan');

module.exports = function (db) {
    var session = new SessionHandler();
    var plansHandler = new PlansHandler(db);

    router.post('/', session.authenticatedUser, plansHandler.createPlansInStripe);
    router.get('/', session.authenticatedUser, plansHandler.getPlans);
    router.get('/:id', session.authenticatedUser, plansHandler.getPlan);
    router.delete('/all', session.authenticatedUser, plansHandler.removeAllPlanFromStripe);
    router.delete('/:id', session.authenticatedUser, plansHandler.removePlanFromStripe);

    return router;
};