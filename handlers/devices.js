'use strict';
var util = require('util');
var DEVICE_OS = require('../constants/deviceOs');
var DEVICE_STATUSES = require('../constants/deviceStatuses');
var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');
var badRequests = require('../helpers/badRequests');
var logWriter = require('../helpers/logWriter')();
var SessionHandler = require('../handlers/sessions');
var stripeModule = require('../helpers/stripe');
var calculateTariff = require('../public/js/libs/costCounter');

var DeviceHandler = function (db) {
    var session = new SessionHandler(db);
    var deviceSchema = mongoose.Schemas['Device'];
    var userSchema = mongoose.Schemas['User'];
    var UserModel = db.model('User', userSchema);
    var DeviceModel = db.model('Device', deviceSchema);
    var tariffPlanSchema = mongoose.Schemas['TariffPlan'];
    var TariffPlan = db.model('TariffPlan', tariffPlanSchema);

    var self = this;

    function prepareDeviceData(data) {
        var deviceData = {};

        if (data && data.deviceId) {
            deviceData.deviceId = data.deviceId;
        }

        if (data && data.name) {
            deviceData.name = data.name;
        }

        if (data && data.deviceName) {
            deviceData.name = data.deviceName; //TODO: use data.name
        }

        if (data && data.deviceType) {
            deviceData.deviceType = data.deviceType;
        }

        return deviceData;
    };

    function validateDeviceData(data, callback) {
        'use strict';

        if (!data || !data.deviceId || !data.deviceName) {
            if (callback && (typeof callback === 'function')) {
                callback(badRequests.NotEnParams({reqParams: ['deviceId', 'deviceName']}));
            }
            return;
        }

        if (callback && (typeof callback === 'function')) {
            callback();
        }
    };

    function subscribe(userModel, plan, token, callback) {
        var userId = userModel._id.toString();
        var freeDevice = false;
        if (!plan.amount) {
            freeDevice = true;
        }

        async.waterfall([

            //check is exists customer in stripe and create if need:
            function (cb) {
                var stripeId = userModel.billings.stripeId;
                var customerData;

                if (freeDevice) { // do nothing if free account
                    return cb(null, null, userModel);
                }

                if (!stripeId) {

                    customerData = {
                        email: userModel.email,
                        metadata: {
                            userId: userModel._id.toString()
                        }//,
                        //source: token.id
                    };
                    stripeModule.createCustomer(customerData, function (err, customer) {
                        if (err) {
                            return cb(err);
                        }

                        /*stripeModule.createCard(customer.id, token.id, function (err, card) {
                         if (err) {
                         return cb(err);
                         }
                         cb(null, customer.id, userModel);
                         });*/

                        cb(null, customer.id, userModel);
                    });

                    /*
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
                     */

                } else {
                    cb(null, stripeId, userModel);
                }
            },

            //update user.stripeId if need:
            function (stripeId, user, cb) {

                if (freeDevice) { // do nothing if free account
                    return cb(null, user);
                }

                if (!user.billings.stripeId) {

                    user.billings.stripeId = stripeId;
                    user.save(function (err, updatedUser) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, updatedUser);
                    });

                } else {
                    cb(null, user);
                }
            },

            //make subscription:
            function (user, cb) {
                //cb(null, user); //TODO: ...
                /*var subscriptionParams = {
                 customerId: user.billings.stripeId,
                 planId: 'sub_2',
                 quantity: 2,
                 source: token.id
                 };
                 stripeModule.createSubscription(subscriptionParams, function (err, result) {
                 if (err) {
                 return cb(err);
                 }
                 cb(null, user, result);
                 });*/

                if (freeDevice) { // do nothing if free account
                    return cb(null, user, null);
                }

                var chargeParams = {
                    amount: plan.amount,  //price
                    source: token.id,
                    description: 'Minder charge for ' + user.email + ' plan ' + plan.plan,
                    metadata: {
                        planId: plan._id,
                        quantity: plan.devicesToPay,
                        expired: ''
                    }
                };
                stripeModule.createCharge(chargeParams, function (err, charge) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, charge);
                });
            },

        ], function (err, charge) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
                return;
            }
            if (callback && (typeof callback === 'function')) {
                callback(null, charge);
            }
        });
    };

    function updateStatusToSubscribed(userId, deviceIds, plan, subscriptionId, callback) {
        var freeAccount = false;
        if (!plan.amount) {
            freeAccount = true;
        }
        async.waterfall([

            //update devices status = "subscribed":
            function (cb) {
                var period = plan.period;
                var update;
                var dateNow = new Date();
                var criteria = {
                    user: userId,
                    status: DEVICE_STATUSES.ACTIVE,
                    _id: {
                        $in: deviceIds
                    }
                };

                if (freeAccount) {
                    update = {
                        status: DEVICE_STATUSES.SUBSCRIBED,
                        billings: {
                            subscriptionId: null,
                            subscriptionDateTime: dateNow,
                            expirationDate: null
                        }
                    };
                } else {
                    update = {
                        status: DEVICE_STATUSES.SUBSCRIBED,
                        billings: {
                            subscriptionId: subscriptionId,
                            subscriptionDateTime: dateNow,
                            expirationDate: plan.expirationDate
                        }
                    };
                }


                DeviceModel.update(criteria, update, {multi: true}, function (err, quantity) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, quantity);
                });

            },

            //update user.billings.subscribedDevices:
            function (quantity, cb) {
                self.incrementSubscribedDevicesCount(userId, quantity, plan, function (err, updatedUser) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, updatedUser);
                });
            }

        ], function (err, updatedUser) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
                return;
            }

            if (callback && (typeof callback === 'function')) {
                callback(null, updatedUser);
            }
        });
    };

    this.validateDeviceData = validateDeviceData;

    this.prepareDeviceData = prepareDeviceData;

    this.getDeviceOS = function (req) {
        var userAgent = req.headers['user-agent'].toLowerCase();

        if ((userAgent.indexOf('iphone') !== -1) || (userAgent.indexOf('darwin/14') !== -1) || (userAgent.indexOf('ipad') !== -1)) {
            return DEVICE_OS.IOS;
        }

        if (userAgent.indexOf('android') !== -1) {
            return DEVICE_OS.ANDROID;
        }

        if (userAgent.indexOf('trident') !== -1) {
            return DEVICE_OS.WINDOWS_PHONE;
        }

        return DEVICE_OS.UNKNOWN;
    };

    this.isMobile = function (req) {
        var deviceOs = self.getDeviceOS(req);

        if (deviceOs !== DEVICE_OS.UNKNOWN) {
            return true;
        } else {
            return false;
        }
    };

    this.createDevice = function (deviceData, userModel, callback) {
        var newDevice;

        newDevice = new DeviceModel(deviceData);
        newDevice.user = userModel._id;
        newDevice.save(function (err, result) {

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

    this.setLocation = function (req, res, next) {
        var options = req.body;
        var criteria = {}; // find criteria

        if (!options.deviceId || !options.location || !options.location.long || !options.location.lat) {
            return next(badRequests.NotEnParams({reqParams: ['deviceId', 'location', 'location.long', 'location.lat']}));
        }

        criteria.deviceId = options.deviceId; // set device to find

        DeviceModel
            .findOne(criteria, function (err, device) {
                if (err) {
                    return next(err);
                } else if (!device) {
                    // wrong deviceId response
                    return next(badRequests.NotFound());
                } else {
                    // if subscribed - update device location
                    if (device.status === DEVICE_STATUSES.SUBSCRIBED) {

                        // update params
                        device.lastLocation = {
                            long: options.location.long,
                            lat: options.location.lat,
                            dateTime: new Date()
                        };

                        // save device
                        device.save(function (err) {
                            if (err) {
                                return next(err);
                            }

                            // response success
                            res.status(200).send({
                                success: true
                            })
                        });

                    } else {
                        // reject update location
                        next(badRequests.PaymentRequired());
                    }
                }
            });
    };

    this.getLocation = function (req, res, next) {
        var userId = req.session.userId;
        var options = req.body;
        var criteria = {
            status: DEVICE_STATUSES.SUBSCRIBED
        };
        var deviceIds = options.deviceIds;
        var fields = {
            name: 1,
            _id: 1,
            lastLocation: 1,
            updatedAt: 1
        };

        if (!deviceIds || !deviceIds.length) {
            return next(badRequests.NotEnParams({reqParams: ['deviceIds']}));
        }

        criteria._id = {
            $in: deviceIds
        };

        if (!session.isAdmin(req)) {
            criteria.user = userId;
        }

        DeviceModel.find(criteria, fields)
            .exec(function (err, devices) {
                if (err) {
                    return next(err);
                }
                res.status(200).send(devices);
            });
    };

    this.getDevices = function (req, res, next) {
        var userId = req.session.userId;
        var params = req.query;
        var criteria = {};
        var page = parseInt(params.page) || 1;
        var count = parseInt(params.count) || 10;
        var skip = 0;

        if (!session.isAdmin(req)) {
            criteria.user = userId;
        }

        if (page > 1) {
            skip = (page - 1 ) * count;
        }

        if (params.name) {
            criteria.name = new RegExp(params.name.trim(), "i");
        }

        if (params) {
            if (typeof params.status === 'string') {
                if ((params.status === DEVICE_STATUSES.ACTIVE) ||
                    (params.status === DEVICE_STATUSES.SUBSCRIBED) ||
                    (params.status === DEVICE_STATUSES.DELETED)) {
                    criteria.status = params.status;
                }
            } else if (util.isArray(params.status)) {
                criteria.status = {
                    $in: params.status
                };
            }
        }


        DeviceModel.find(criteria, 'billings.expirationDate name status _id')
            .sort('name')
            .limit(count)
            .skip(skip)
            .exec(function (err, devices) {
                if (err) {
                    return next(err);
                }
                res.status(200).send(devices);
            });
    };

    this.countDevices = function (req, res, next) {
        var params = req.query;

        console.log(params);
        var criteria = {
            user: req.session.userId
        };
        var skip = 0;

        params.page = parseInt(params.page) || 1;
        params.count = parseInt(params.count) || 10;

        if (params.page > 1) {
            skip = (params.page - 1 ) * params.count;
        }

        if (params.name) {
            criteria.name = new RegExp(params.name.trim(), "i");
        }

        if (params.status) {
            if (typeof params.status === 'string') {
                if ((params.status === DEVICE_STATUSES.ACTIVE) ||
                    (params.status === DEVICE_STATUSES.SUBSCRIBED) ||
                    (params.status === DEVICE_STATUSES.DELETED)) {
                    criteria.status = params.status;
                }
            } else if (util.isArray(params.status)) {
                params.status = {
                    $in: params.status
                };
            }
        }

        //console.log(params, skip);

        DeviceModel.count(criteria)
            .exec(function (err, devices) {
                if (err) {
                    return next(err);
                }
                res.status(200).send({count: devices});
            });
    };

    this.getDevice = function (req, res, next) { //TODO: question: check criteria
        var userId = req.session.userId;
        var id = req.params.id;
        var criteria = {
            _id: id
        };

        DeviceModel
            .findOne(criteria)
            .exec(function (err, device) {
                var ownerId;

                if (err) {
                    next(err);
                } else if (!device) {
                    next(badRequests.NotFound());
                } else {

                    ownerId = device.user.toString();

                    if (session.isAdmin(req) || (ownerId === userId)) {
                        res.status(200).send(device);
                    } else {
                        next(badRequests.AccessError());
                    }
                }
            });
    };

    this.updateDevice = function (req, res, next) {
        var options = req.body;
        var userId = req.session.userId;
        var id = req.params.id;
        var criteria = {
            _id: id
        };
        var update = {};

        if (options.name) {
            update.name = options.name;
        }

        if (options.enabledTrackLocation !== undefined) {
            //TODO check if isPayed for enabledTrackLocation = true;
        }

        if (!Object.keys(update).length) {
            return next(badRequests.NotEnParams({reqParams: ['name']}));
        }

        if (!session.isAdmin(req)) {
            criteria.user = userId;
        }

        DeviceModel
            .findOneAndUpdate(criteria, update)
            .exec(function (err, device) {
                if (err) {
                    next(err);
                } else if (!device) {
                    next(badRequests.NotFound());
                } else {
                    res.status(200).send({success: 'updated', model: device});
                }
            });

    };

    this.removeDevice = function (req, res, next) {
        /*var id = req.params.id;
         var userId = req.session.userId;

         var criteria = {
         _id: id
         };

         if (!session.isAdmin(req)) {
         criteria.user = userId;
         }

         DeviceModel.findOneAndRemove(criteria, function (err, result) {
         if (err) {
         next(err);
         } else if (!result) {
         next(badRequests.NotFound());
         } else {
         res.status(200).send({success: 'removed'});
         }
         });*/

        res.status(500).send('Not implemented');
    };

    this.updateStatus = function (req, res, next) { // active / deleted
        var userId = req.session.userId;
        var deviceId = req.params.id;
        var options = req.body;
        var deviceStatus = options.status;
        var criteria;

        if (!deviceStatus) {
            return next(badRequests.NotEnParams({reqParams: 'status'}));
        }

        if ((deviceStatus !== DEVICE_STATUSES.ACTIVE) && (deviceStatus !== DEVICE_STATUSES.DELETED)) {
            return next(badRequests.InvalidValue({param: 'status'}));
        }


        if (session.isAdmin(req)) {
            criteria = {
                _id: deviceId
            };
        } else {
            criteria = {
                _id: deviceId,
                user: userId
            };
        }

        DeviceModel.findOne(criteria, function (err, device) {
            var oldStatus = device.status;

            if (err) {
                return callback(err);
            } else if (!device) {
                return callback(badRequests.NotFound());
            }

            device.status = deviceStatus;
            device.billings.expirationDate = null;
            device.save(function (err, updatedDevice) {
                var ownerId;
                var calculationOptions = {};

                if (err) {
                    return next(err);
                }
                if (!updatedDevice) {
                    return next(badRequests.NotFound());
                }

                if (oldStatus === DEVICE_STATUSES.SUBSCRIBED) {
                    ownerId = device.user.toString();

                    calculationOptions = {
                        userId: userId,
                        quantity: -1
                    };

                    // returns plan from calculator
                    self.getUserTariffPlan(calculationOptions, function (err, plan) {
                        self.incrementSubscribedDevicesCount(ownerId, -1, plan, function (err) {
                            if (err) {
                                if (process.env.NODE_ENV !== 'production') {
                                    console.error(err);
                                    logWriter.log('handlers.js setStatusDeleted() -> userHandler.incrementSubscribedDevicesCount', err.stack);
                                }
                            }
                        })
                    });
                }

                res.status(200).send(updatedDevice);
            });
        });
    };

    this.getUserTariffPlan = function (options, callback) {

        async.parallel({
            plans: function (cb) {
                if (options.plans) {
                    return cb(null, options.plans)
                }

                TariffPlan.find({}, function (err, plans) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, plans);
                })
            },
            user: function (cb) {
                if (options.user) {
                    return cb(null, options.user)
                }

                UserModel.findOne({
                    _id: options.userId
                }, function (err, user) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, user);
                })
            }
        }, function (err, results) {
            var user = results.user;
            var plans = results.plans;
            var calculateParams = {};
            var quantity = options.quantity || 0;

            if (err) {
                return callback(err);
            }

            calculateParams = {
                date: new Date(),
                plans: plans,
                period: options.period || user.planPeriod,
                user: user,
                selectedDevicesCount: quantity
            };

            calculateTariff(calculateParams, function (err, plan) {
                if (err) {
                    return callback(err);
                }
                return callback(null, plan);
            });

        });
    };

    this.incrementSubscribedDevicesCount = function (userId, quantity, plan, callback) {

        var criteria = {
            _id: userId
        };

        var update = {
            $inc: {
                'billings.subscribedDevices': quantity
            },
            currentPlan: plan.plan_id,
            planPeriod: plan.period
        };


        UserModel.findOneAndUpdate(criteria, update, function (err, userModel) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
            } else {
                if (callback && (typeof callback === 'function')) {
                    callback(null, userModel);
                }
            }
        });
    };

    this.subscribeDevices = function (req, res, next) {
        var token = req.body.token;
        var deviceIds = req.body.deviceIds;
        var period = req.body.period;
        var userId = req.session.userId;

        // validations
        if (!deviceIds || deviceIds.length === 0 || !period) {
            return next(badRequests.NotEnParams({reqParams: ['deviceIds', 'period']}));
        }

        async.parallel({

            // get user model
            user: function (cb) {
                UserModel.findById(userId, function (err, user) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, user);
                });
            },

            // get available tariff plans
            plans: function (cb) {
                var criteria = {};

                TariffPlan.find(criteria, function (err, plans) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, plans)
                });
            },

            // prevent wrong subscriptions
            checkSubscribedDevices: function (cb) {
                var criteria = {
                    user: userId,
                    status: DEVICE_STATUSES.SUBSCRIBED,
                    _id: {
                        $in: deviceIds
                    }
                };
                var fields = '_id';

                // check id devices already subscribed
                DeviceModel.find(criteria, fields, function (err, devices) {
                    if (err) {
                        cb(err);
                    } else if (devices && devices.length) {
                        cb(badRequests.DeviceAlreadySubscribed());
                    } else {
                        cb();
                    }
                });
            },

            // prevent wrong subscriptions
            checkActiveDevices: function (cb) {
                var criteria = {
                    user: userId,
                    status: DEVICE_STATUSES.ACTIVE,
                    _id: {
                        $in: deviceIds
                    }
                };
                var fields = '_id';
                // filter active devices
                DeviceModel.find(criteria, fields, function (err, devices) {
                    var activeIds;

                    if (err) {
                        cb(err);
                    } else if (!devices || !devices.length) {
                        cb(badRequests.NoActiveDevices());
                    } else {

                        // get array with active devices ids
                        activeIds = _.pluck(devices, '_id');
                        cb(null, activeIds);
                    }
                });
            }

        }, function (err, results) {
            var user = results.user;
            var plans = results.plans;
            var activeDeviceIds = results.checkActiveDevices;
            var calculationOptions;

            if (err) {
                return next(err);
            }

            calculationOptions = {
                user: user,
                quantity: activeDeviceIds.length,
                plans: plans,
                period: period
            };

            // returns plan from calculator
            self.getUserTariffPlan(calculationOptions, function (err, plan) {
                if (err) {
                    return next(err);
                }

                if (!token && plan.amount !== 0) {
                    return next(badRequests.NotEnParams({reqParams: ['deviceIds', 'period', 'token']}));
                }

                async.waterfall([

                    //subscription:
                    function (cb) {
                        subscribe(user, plan, token, function (err, subscriptionResult) {
                            if (err) {
                                return cb(err);
                            }
                            cb(null, subscriptionResult);
                        });
                    },

                    //update Devices.status to "subscribed" and User.billings.subscribedDevices
                    // subscriptionResult is chargeId
                    function (subscriptionResult, cb) {
                        updateStatusToSubscribed(userId, activeDeviceIds, plan, subscriptionResult, function (err, user) {
                            if (err) {
                                return cb(err);
                            }
                            cb(null, user);
                        });
                    }

                ], function (err, result) {
                    if (err) {
                        return next(err);
                    }
                    res.status(200).send({success: 'subscribed'});
                });
            });
        });
    };

    this.unsubscribeDevices = function (req, res, next) {
        var options = req.body;
        var userId = req.session.userId;
        var deviceIds = options.deviceIds;

        if (!deviceIds) {
            return next(badRequests.NotEnParams({reqParams: 'deviceIds'}));
        }

        async.waterfall([

            //update devices:
            function (cb) {
                var criteria = {
                    user: userId,
                    status: DEVICE_STATUSES.SUBSCRIBED,
                    _id: {
                        $in: deviceIds
                    }
                };
                var update = {
                    status: DEVICE_STATUSES.ACTIVE,
                    billings: {
                        expirationDate: null
                    }
                };

                DeviceModel.update(criteria, update, {multi: true}, function (err, count) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, count);
                });
            },

            //update Users.billings.subscribedDevices:
            function (updatedDevicesCount, cb) {
                var quantity = ( -1 ) * updatedDevicesCount;
                var calculationOptions = {
                    quantity: quantity,
                    userId: userId
                };

                self.getUserTariffPlan(calculationOptions, function (err, plan) {
                    if (err) {
                        return cb(err);
                    }
                    self.incrementSubscribedDevicesCount(userId, quantity, plan, function (err, userModel) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, userModel);
                    });
                });
            }

        ], function (err, userModel) {
            if (err) {
                return next(err);
            }

            res.status(200).send({success: 'unsubscribed'});
        });

    };

        this.cron = function (req, res, next) {
        async.waterfall([
            function (cb) {
                // unSubscribe unPaid devices
                var criteria = {};
                var update ={};

                criteria = {
                    status: DEVICE_STATUSES.SUBSCRIBED,
                    renewEnabled: false,
                    $ne: {
                        "billings.expirationDate": null
                    },
                    $lte: {
                        "billings.expirationDate": new Date()
                    }
                };

                update = {
                    $set: {
                        status: "active",
                        billings:{
                            expirationDate: null,
                            subscriptionId: null
                        }
                    }
                };

                DeviceModel.find(criteria, function(err, count){
                    if(err){
                        return cb(err);
                    }
                    cb(null, count);
                });
                //DeviceModel.update(criteria, update, {
                //    multi: true
                //}, function(err, count){
                //    if(err){
                //        return cb(err);
                //    }
                //    cb(null, count);
                //});
            }
        ], function (err, result) {
            res.send(result);
        });
    }

};

module.exports = DeviceHandler;