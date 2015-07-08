'use strict';

var stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
var mongoose = require('mongoose');
var async = require('async');
//var _ = require('underscore');
var _ = require('lodash');

var DEVICE_STATUSES = require('../constants/deviceStatuses');
//var STATUSES = require('../constants/deviceStatuses');
var badRequests = require('../helpers/badRequests');
var DeviceHandler = require('../handlers/devices');
var stripeModule = require('../helpers/stripe');

var TariffPlanHandler = function (db) {
    var deviceHandler = new DeviceHandler(db);
    var self = this;

    var tariffPlanSchema = mongoose.Schemas['TariffPlan'];
    var TariffPlan = db.model('TariffPlan', tariffPlanSchema);

    var userSchema = mongoose.Schemas['User'];
    var UserModel = db.model('User', userSchema);

    var deviceSchema = mongoose.Schemas['Device'];
    var DeviceModel = db.model('Device', deviceSchema);

    var calculateTariff = require('../public/js/libs/costCounter');

    function renewEnabled(userModel, token, callback) {
        var stripeId = '';
        var cardId = '';

        if (!userModel || !token) {
            if (callback && (typeof callback === 'function')) {
                callback(badRequests.NotEnParams({reqParams: ['userModel', 'token']}));
            }
            return;
        }

        if (token && token.card && token.card.id) {
            cardId = token.card.id
        } else {
            if (callback && (typeof callback === 'function')) {
                callback(badRequests.NotEnParams({reqParams: ['userModel', 'token', 'token.card.id']}));
            }
            return;
        }

        stripeId = userModel.billings.stripeId;

        if (!stripeId) {
            if (callback && (typeof callback === 'function')) {
                callback(badRequests.AccessError({message: 'You have not registered in Stripe'}));
            }
            return;
        }

        async.waterfall([

            function (cb) {
                var update = {
                    source: token.id
                };

                stripeModule.stripe.customers.update(stripeId, update, function (err, customer) {
                    if (err) {
                        return cb(err);
                    }
                    cb();
                });
            }

        ], function (err) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
            } else {
                if (callback && (typeof callback === 'function')) {
                    callback();
                }
            }
        });
    }

    function renewDisabled(userModel, callback) {
        var stripeId = userModel.billings.stripeId;

        async.waterfall([

            function (cb) {
                stripeModule.stripe.customers.retrieve(stripeId, function (err, customer) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, customer);
                });

            },

            function (customer, cb) {
                var cardId = customer.default_source;

                if (cardId) {
                    stripeModule.stripe.customers.deleteCard(stripeId, cardId, function (err, confirmation) {
                        if (err) {
                            return cb(err);
                        }
                        cb();
                    });
                } else {
                    cb();
                }
            }

        ], function (err) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
            } else {
                if (callback && (typeof callback === 'function')) {
                    callback();
                }
            }
        });
    };

    this.renewal = function (req, res, next) {
        var userId = req.session.userId;
        var options = req.body;
        var type = options.renewal;
        var token = options.token;

        if (type === undefined) {
            return next(badRequests.NotEnParams({reqParams: 'type'}));
        }

        if ((type === true) && !token) {
            return next(badRequests.NotEnParams({reqParams: ['type', 'token']}));
        }

        async.waterfall([

            //find the user:
            function (cb) {
                var criteria = {
                    _id: userId
                };

                UserModel.findOne(criteria, function (err, userModel) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, userModel);
                });
            },

            //create / remove stripe source:
            function (userModel, cb) {
                if (type) {
                    renewEnabled(userModel, token, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, userModel);
                    });
                } else {
                    renewDisabled(userModel, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, userModel);
                    });
                }
            },

            //update DeviceModels:
            function (userModel, cb) {
                var criteria = {
                    user: userModel._id
                };
                var update = {
                    $set: {
                        "billings.renewEnabled": type,
                        updatedAt: new Date()
                    }
                };

                DeviceModel.update(criteria, update, {multi: true}, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, userModel);
                });

            },

            //update UserModel:
            function (userModel, cb) {
                if (userModel.billings.renewEnabled !== type) {

                    userModel.billings.renewEnabled = type;
                    userModel.updatedAt = new Date();
                    userModel.save(function (err, updatedUserModel) {
                        if (err) {
                            return cb(err);
                        }
                        cb();
                    });

                } else {
                    cb();
                }
            }

        ], function (err) {
            if (err) {
                return next(err);
            }
            res.status(200).send({success: 'updated'});
        });
    };

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

    this.createPlansInStripe = function (req, res, next) {

        TariffPlan
            .find({})
            .sort('name')
            .exec(function (err, planModels) {
                if (err) {
                    return next(err);
                }
                if (!planModels || !planModels.length) {
                    return next(badRequests.NotFound({message: 'There was no TariffPlans found'}));
                }

                async.eachSeries(planModels, function (planModel, cb) {
                    var planJSON = planModel.toJSON();
                    var data = {
                        id: planJSON._id.toString(),
                        name: planJSON.name,
                        interval: planJSON.interval,
                        amount: planJSON.amount,
                        currency: planJSON.currency,
                        statement_descriptor: "Minder " + planJSON.name + " Tear",
                        metadata: planJSON.metadata
                    };

                    stripe.plans.create(data, function (err, plan) {
                        if (err) {
                            return cb(err);
                        }
                        cb();
                    });
                }, function (err) {
                    if (err) {
                        return next(err);
                    }
                    res.status(201).send({success: "created", models: planModels});
                });
            });
    };

    function listPlans(callback) {
        stripe.plans.list(function (err, plans) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
            } else {
                if (callback && (typeof callback === 'function')) {
                    callback(null, plans.data);
                }
            }
        });
    };

    function getPlanById(planId, callback) {
        stripe.plans.retrieve(planId, function (err, plan) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
            } else {
                if (callback && (typeof callback === 'function')) {
                    callback(null, plan);
                }
            }
        });
    };

    this.getPlans = function (req, res, next) {
        listPlans(function (err, plansData) {
            if (err) {
                return next(err);
            }
            res.status(200).send(planData);
        });
    };

    this.getPlan = function (req, res, next) {
        var planId = req.params.id;

        getPlanById(planId, function (err, plan) {
            if (err) {
                return next(err);
            }
            res.status(200).send(plan);
        });
    };

    function removePlan(planId, callback) {
        stripe.plans.del(planId, function (err, result) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
            } else {
                if (callback && (typeof callback === 'function')) {
                    callback(null, result);
                }
            }
        });
    };

    this.removePlanFromStripe = function (req, res, next) {
        var planId = req.params.id;

        removePlan(planId, function (err, result) {
            if (err) {
                return next(err);
            }
            res.status(200).send({success: 'removed', result: result});
        });
    };

    this.removeAllPlanFromStripe = function (req, res, next) {
        listPlans(function (err, plans) {
            var planIds;

            if (err) {
                return next(err);
            }

            planIds = _.pluck(plans, 'id');

            async.each(planIds, removePlan, function (err) {
                if (err) {
                    return next(err);
                }
                res.status(200).send({success: 'removed all plan'});
            });
        });
    };

    this.checkSubscribeForGeofence = function(callback){
        async.waterfall([

            //function (cb) {
            //    var now = new Date();
            //    var criteria = {
            //        "geoFence.status"        : DEVICE_STATUSES.SUBSCRIBED,
            //        "geoFence.expirationDate": {
            //            $ne : null,
            //            $lte: now
            //        }
            //    };
            //    var fields = 'user name geoFence.expirationDate';
            //
            //    DeviceModel.find(criteria, fields, function (err, devices) {
            //        if (err) {
            //            return cb(err);
            //        }
            //        cb(null, devices);
            //    });
            //
            //},

            function (cb) {
                var now = new Date();

                DeviceModel.aggregate([{
                    $match: {
                        "geoFence.status": DEVICE_STATUSES.SUBSCRIBED,
                        "geoFence.expirationDate": {
                            $ne: null,
                            $lte: now
                        }
                    }
                }, {
                    $group: {
                        _id: "$user",
                        devices : {
                            $push : {
                                _id : "$_id",
                                geoFence : "$geoFence"
                            }
                        }
                    }
                }]).exec(function (err, rows) {
                    var userIds;

                    if (err) {
                        return cb(err);
                    }

                    userIds = _.pluck(rows, '_id');
                    cb(null, userIds);
                });
            },

            function (devices, cb) {
                var now = new Date();
                var criteria;
                var update;
                var deviceIds;

                if (devices && devices.length) {

                    deviceIds = _.pluck(devices, '_id');
                    criteria = {
                        _id: {
                            $in: deviceIds
                        }
                    };
                    update = {
                        $set: {
                            "geoFence.status"        : DEVICE_STATUSES.ACTIVE,
                            "geoFence.expirationDate": null,
                            "geoFence.subscriptionId": null,
                             updatedAt               : now
                        }
                    };

                    DeviceModel.update(criteria, update, { multi: true }, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, devices);
                    });

                } else {
                    cb(null, devices);
                }
            }

        ],function(err,result){
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
            } else {
                if (callback && (typeof callback === 'function')) {
                    callback();
                }
            }
        })
    };

    this.testCheckSubscribeForGeofence = function (req, res, next) {
        self.checkSubscribeForGeofence(function (err, result) {
            if (err) {
                return next(err);
            }
            res.status(200).send({ success: 'success job', result: result });
        });
    };
};

module.exports = TariffPlanHandler;