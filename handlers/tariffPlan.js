'use strict';

var stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
var mongoose = require('mongoose');
var async = require('async');
//var _ = require('underscore');
var _ = require('lodash');

var STATUSES = require('../constants/deviceStatuses');
var badRequests = require('../helpers/badRequests');

var TariffPlanHandler = function (db) {

    var self = this;

    var tariffPlanSchema = mongoose.Schemas['TariffPlan'];
    var TariffPlan = db.model('TariffPlan', tariffPlanSchema);

    var userSchema = mongoose.Schemas['User'];
    var UserModel = db.model('User', userSchema);

    var deviceSchema = mongoose.Schemas['Device'];
    var DeviceModel = db.model('Device', deviceSchema);

    var calculateTariff = require('../public/js/libs/costCounter');

    //function getStripeTariffs(callback) {
    //    stripe.plans.list(
    //        {limit: 100},
    //        function (err, plans) {
    //            if (err) {
    //                return callback(err);
    //            }
    //            var data = plans.data;
    //            for(var i= 0;i<data.length; i++){
    //                data[i].metadata.minDevices = parseInt( data[i].metadata.minDevices);
    //                data[i].metadata.maxDevices = parseInt( data[i].metadata.maxDevices);
    //            }
    //            callback(null, data);
    //        }
    //    );
    //}

    function getStripeTariffs(callback) {
        TariffPlan.find({}, function (err, plans) {
            if (err) {
                return callback(err);
            }
            callback(null, plans);
        })
    }


    this.getTariffPans = function (req, res, next) {
        getStripeTariffs(function (err, plans) {
            if (err) {
                next(err);
            }
            res
                .status(200)
                .send(plans);
        });
    };

    this.subscribe = function (req, res, next) {
        res.status(500).send({error: 'Not Implemented'});

        /*var tokenObject = req.body.tokenObject; //TODO: token
        var devices = req.body.devices;//TODO deviceIds
        var userId = req.session.userId;
        var plan = null;
        var deviceIds = devices;

        if (!tokenObject) {
            return next(badRequests.NotEnParams({reqParams: ['token', 'deviceIds']}));
        }

        if (!deviceIds || deviceIds.length === 0) {
            return next(badRequests.NotEnParams({reqParams: ['token', 'deviceIds']}));
        }

        async.parallel({

            user: function (cb) {
                UserModel.findById(userId, function (err, user) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, user);
                });
            },

            plans: function (cb) {
                var criteria = {};

                TariffPlan.find(criteria, function (err, plans) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, plans)
                });
            },

            checkSubscribedDevices: function (cb) {
                var criteria = {
                    user: userId,
                    status: STATUSES.SUBSCRIBED,
                    _id: {
                        $in: deviceIds
                    }
                };
                var fields = '_id';

                DeviceModel.find(criteria, fields, function (err, devices) {
                    if (err) {
                        cb(err);
                    } else if (devices && devices.length) {
                        cb(badRequests.DeviceIdInUse());
                    } else {
                        cb();
                    }
                });
            }

        }, function (err, results) {
            var userModel = results.user;
            var plans = results.plans;
            var customerData;

            plan = calculateTariff({
                date: new Date(),
                plans: plans,
                user: userModel,
                selectedDevicesCount: deviceIds.length
            });

            if (!userModel.stripeId) {
                customerData = {
                    plan: plan.id,
                    quantity: deviceIds.length,
                    source: tokenObject.id,
                    email: userModel.email
                };

                stripe.customers.create(customerData, function (err, customer) {
                    if (err) {
                        return next(err);
                    }

                    res.status(200).send(customer);
                });

            } else {
                //TODO: ...
            }

        });*/
    };


    //this.getStripeCustomers = function(req, res, next){
    //    stripe.customers.list(
    //        function(err, customers) {
    //            if (err){
    //                console.log(err);
    //                return next(err);
    //            }
    //            console.log(err, customers);
    //            res.send(customers);
    //        }
    //    );
    //}
};

module.exports = TariffPlanHandler;