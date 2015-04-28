'use strict';

var mongoose = require('mongoose');

var TariffPlanHandler = function (db) {

    var tariffPlan = mongoose.Schemas['TariffPlan'];
    var TariffPlan = db.model('TariffPlan', tariffPlan);
    var self = this;

    this.getTariffPans  = function(req,res,next){
        TariffPlan.find(function (err, plans) {
            if (err) {
                return next(err)
            }
            res
                .status(200)
                .send(plans);
        });
    };
};

module.exports = TariffPlanHandler;