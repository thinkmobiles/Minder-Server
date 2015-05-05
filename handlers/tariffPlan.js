'use strict';

var stripe = require('stripe')(process.env.StripePrivateKey);
var mongoose = require('mongoose');
var async = require('async');
var _ = require('underscore');

var STATUSES = require('../constants/statuses');
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
        var tokenObject = req.body.tokenObject;
        var devices = req.body.devices;
        var userId = req.session.userId;
        var plan = null;

        if (!tokenObject) {
            return next(badRequests.NotEnParams());
        }

        if (!devices || devices.length === 0) {
            return next(badRequests.NotEnParams());
        }

        async.parallel({
            user: function (cb) {
                UserModel.findById(userId, function (err, user) {
                    if (err) {
                        if (cb && (typeof cb === 'function')) {
                            cb(err);
                        }
                        return;
                    }
                    cb(null, user)
                });
            },
            plans: function (cb) {
                TariffPlan.find({}, function (err, plans) {
                    if (err) {
                        if (cb && (typeof cb === 'function')) {
                            cb(err);
                        }
                        return;
                    }
                    cb(null, plans)
                });
            },
            checkDevices: function (cb) {
                var intersection;
                DeviceModel.find({
                    user: userId,
                    status: STATUSES.SUBSCRIBED
                }, function (err, userDevices) {
                    intersection = _.intersection(userDevices, devices);
                    if (!intersection || intersection.length === 0) {
                        return cb(badRequests.DeviceIdInUse())
                    }
                    cb(null)
                });
            }
        }, function (err, results) {
            var user = results.user;
            plan = calculateTariff({
                date: new Date(),
                plans: results.plans,
                user: results.user,
                selectedDevicesCount: devices.length
            });

            console.log('>>plan', plan);
            console.log('>>tokenObject', tokenObject);

            if (!user.stripeId) {
                stripe.customers.create({
                    plan: plan.id,
                    quantity: devices.length,
                    source: tokenObject.id,
                    email: user.email
                }, function (err, customer) {
                    if (err) {
                        return next(err);
                    }
                    console.log('>>customer', customer);
                        res
                        .status(200)
                        .send(customer);

                });
            }


        });
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