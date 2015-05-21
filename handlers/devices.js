'use strict';
var util = require('util');
var DEVICE_OS = require('../constants/deviceOs');
var DEVICE_STATUSES = require('../constants/deviceStatuses');
var PLAN_TYPES = require('../constants/planTypes');
var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');
var badRequests = require('../helpers/badRequests');
var logWriter = require('../helpers/logWriter')();
var SessionHandler = require('../handlers/sessions');
var stripeModule = require('../helpers/stripe');
var calculateTariff = require('../public/js/libs/costCounter');
var moment = require('moment');

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
        var isFree = (plan && (plan.amount === 0)) ? true : false;

        async.waterfall([

            //check is exists customer in stripe and create if need:
            function (cb) {
                var stripeId = userModel.billings.stripeId;
                var customerData;

                if (isFree) { // do nothing if free account
                    return cb(null, null, userModel);
                }

                if (!stripeId) {

                    customerData = {
                        email: userModel.email,
                        metadata: {
                            userId: userModel._id.toString()
                        }
                    };
                    stripeModule.createCustomer(customerData, function (err, customer) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, customer.id, userModel);
                    });

                } else {
                    cb(null, stripeId, userModel);
                }
            },

            //update user.stripeId if need:
            function (stripeId, user, cb) {

                if (stripeId && !user.billings.stripeId) {

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
                var chargeParams;

                if (isFree) { // do nothing if free account
                    return cb(null, null);
                }

                chargeParams = {
                    amount: plan.amount,  //price
                    source: token.id,
                    description: 'Minder charge for ' + user.email + ' plan ' + plan.plan,
                    metadata: {
                        planId: plan._id,
                        quantity: plan.devicesToPay,
                        expired: '' //TODO: ???
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
            } else {
                if (callback && (typeof callback === 'function')) {
                    callback(null, charge);
                }
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
                var now = new Date();
                var criteria = {
                    user: userId,
                    status: DEVICE_STATUSES.ACTIVE,
                    _id: {
                        $in: deviceIds
                    }
                };
                var update;

                if (freeAccount) {
                    update = {
                        $set: {
                            status: DEVICE_STATUSES.SUBSCRIBED,
                            "billings.subscriptionId": null,
                            "billings.subscriptionDateTime": now,
                            "billings.expirationDate": null,
                            updatedAt: now
                        }
                    };
                } else {
                    update = {
                        $set: {
                            status: DEVICE_STATUSES.SUBSCRIBED,
                            "billings.subscriptionId": subscriptionId,
                            "billings.subscriptionDateTime": now,
                            "billings.expirationDate": plan.expirationDate,
                            updatedAt: now
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
        var sort = params.sort || 'name';

        if (!session.isAdmin(req)) {
            criteria.user = userId;
        }

        if (page > 1) {
            skip = (page - 1 ) * count;
        }

        if (params.name) {
            criteria.name = new RegExp(params.name.trim(), "i");
        }

        if (params.status) {
            if (typeof params.status === 'string') {
                params.status = parseInt(params.status);

                if ((params.status === DEVICE_STATUSES.ACTIVE) ||
                    (params.status === DEVICE_STATUSES.SUBSCRIBED) ||
                    (params.status === DEVICE_STATUSES.DELETED)) {

                    criteria.status = params.status;
                }
            } else if (Array.isArray(params.status)) {
                criteria.status = {
                    $in: params.status
                };
            }
        }

        DeviceModel.find(criteria, 'billings.expirationDate name status _id')
            .sort(sort)
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
                params.status = parseInt(params.status);

                if ((params.status === DEVICE_STATUSES.ACTIVE) ||
                    (params.status === DEVICE_STATUSES.SUBSCRIBED) ||
                    (params.status === DEVICE_STATUSES.DELETED)) {

                    criteria.status = params.status;
                }
            } else if (Array.isArray(params.status)) {
                criteria.status = {
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
        var update = {
            updatedAt: new Date()
        };

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

        if (deviceStatus === undefined) {
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
                period: options.period || user.billings.planPeriod,
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
            $set: {
                "billings.currentPlan": plan.plan_id,
                "billings.planPeriod": plan.period,
                updatedAt: new Date()
            },
            $inc: {
                'billings.subscribedDevices': quantity
            }
            //billings: {
            //    currentPlan: plan.plan_id,
            //    planPeriod: plan.period,
            //    $inc: {
            //        subscribedDevices: quantity
            //    },
            //}
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
                        var subscrId = subscriptionResult.id;

                        updateStatusToSubscribed(userId, activeDeviceIds, plan, subscrId, function (err, user) {
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
                    $set: {
                        status: DEVICE_STATUSES.ACTIVE,
                        "billings.expirationDate": null,
                        updatedAt: new Date()
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

    function updateSubscribedDevicesCount(options, callback) {
        var criteria = {
            _id: options._id
        };
        var update = {
            "billings.subscribedDevices": options.count,
            updatedAt: new Date()
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

    function renewTheSubscriptionByUser(userData, planModels, callback) {
        var userId = userData._id;
        var devices = userData.devices;
        var deviceIds = _.pluck(devices, '_id');
        var deviceStringsIds = '';

        deviceIds.forEach(function (deviceId) {
            deviceStringsIds += deviceId.toString() + ' ';
        });

        function chargeIsFail(err) {

            if (process.env.NODE_ENV !== 'production') {
                console.log(' -------------------- ');
                console.log('>>> charge is fail');
                console.log('>>> %s', JSON.stringify(userData));
                console.log('Error: %s', err);
                console.log(' -------------------- ');
            }

            var now = new Date();
            var criteria = {
                _id: {
                    $in: deviceIds
                }
            };
            var update = {
                $set: {
                    status: DEVICE_STATUSES.ACTIVE,
                    "billings.expirationDate": null,
                    "billings.subscriptionId": null,
                    updatedAt: now
                }
            };

            DeviceModel.update(criteria, update, {multi: true}, function (err, devices) {
                if (err) {
                    if (process.env.NODE_ENV !== 'production') {
                        console.error(err);
                    }
                }
            });
        };

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

            //get the User.currentPlan:
            function (userModel, cb) {
                var currentPlanModel = _.find(planModels, function (plan) {
                    return plan._id.toString() === userModel.billings.currentPlan.toString();
                });

                cb(null, userModel, currentPlanModel);
            },

            //try to make charge:
            function (userModel, plan, cb) {
                var quantity = devices.length;
                var price = quantity * plan.amount;
                var planId = plan._id.toString();
                var expirationDate;
                var description;
                var chargeParams;
                var date = new Date();
                var err;


                //calculate the expirationDate:
                if (plan.metadata.type === PLAN_TYPES.MONTH) {
                    expirationDate = new Date(date.setMonth( date.getMonth() + 1 ));
                } else if (plan.metadata.type === PLAN_TYPES.YEAR) {
                    expirationDate = new Date(date.setFullYear(date.getFullYear() + 1));
                } else {
                    err = new Error();
                    err.message = 'Invalid value for plan.metadata.type';
                    return cb(err);
                }

                description = 'Minder charge (renew) for ' + userModel.email + '. Renew subscription for ' + quantity + ' devices. Plan: ' + plan.name + ', expirationDate: ' + expirationDate.toISOString();

                //try to make charge:
                chargeParams = {
                    customer: userModel.billings.stripeId,
                    amount: price,
                    description: description,
                    metadata: {
                        planId: planId,
                        quantity: quantity,
                        expirationDate: expirationDate,
                        deviceIds: deviceStringsIds
                    }
                };

                /*
                 https://stripe.com/docs/api:
                 Metadata - "A set of key/value pairs that you can attach to a charge object.
                 It can be useful for storing additional information about the customer in a structured format.
                 It's often a good idea to store an email address in metadata for tracking later."
                */

                stripeModule.createCharge(chargeParams, function (err, charge) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, charge);
                });
            },

            //update the Devices.billings:
            function (charge, cb) {
                var now = new Date();
                var criteria = {
                    _id: {
                        $in: deviceIds
                    }
                };
                var update = {
                    $set: {
                        "billings.subscriptionId": charge.id,
                        "billings.expirationDate": charge.metadata.expirationDate,
                        updatedAt: now
                    }
                };

                DeviceModel.update(criteria, update, {multi: true}, function (err, devices) {
                    if (err) {
                       return cb(err);
                    }
                    cb(null, charge);
                });
            }

        ], function (err, result) {
            if (err) {
                chargeIsFail(err);
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

    function renewTheSubscription(userData, callback) {

        async.waterfall([

            //get the current active tariff plans:
            function (cb) {
                var criteria = {};

                TariffPlan.find(criteria, function (err, plans) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, plans)
                });
            },

            //try to renew the subscription:
            function (plans, cb) {

                async.each(userData, function (data, eachCb) {
                    renewTheSubscriptionByUser(data, plans, function (err, result) {
                        if (err) {
                            if (process.env.NODE_ENV !== 'production') {
                                console.error(err);
                            }
                        }
                        eachCb();
                    });
                }, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    cb();
                });

            }

        ], function (err, results) {
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

    this.startCronJob = function (callback) {

        async.waterfall([

            //update devices with status "subscribed" and expired subscr.date and renewEnabled === false;
            function (cb) {
                var now = new Date();
                var criteria = {
                    status: DEVICE_STATUSES.SUBSCRIBED,
                    "billings.renewEnabled": false,
                    "billings.expirationDate": {
                        $ne: null,
                        $lte: now
                    }
                };

                var update = {
                    $set: {
                        status: DEVICE_STATUSES.ACTIVE,
                        "billings.expirationDate": null,
                        "billings.subscriptionId": null,
                        updatedAt: now
                    }
                };

                DeviceModel.update(criteria, update, {multi: true}, function (err, devices) {
                    if (err) {
                        return cb(err);
                    }
                    cb();
                });
            },

            ////update devices with status "subscribed" and expired subscr.date and renewEnabled === true;
            function (cb) {
                var now = new Date();
                var query = DeviceModel.aggregate([{
                    $match: {
                        status: DEVICE_STATUSES.SUBSCRIBED,
                        "billings.renewEnabled": true,
                        "billings.expirationDate": {
                            $ne: null,
                            $lte: now
                        }
                    }
                }, {
                    $group: {
                        _id: "$user",
                        count: {
                            $sum: 1
                        },
                        devices: {
                            $push: {
                                _id: "$_id",
                                deviceId: "$deviceId" //TODO: remove from select
                            }
                        }
                    }
                }]);

                query.exec(function (err, results) {
                    if (err) {
                        return cb(err);
                    }

                    if (!results.length) {
                        return cb();
                    }

                    renewTheSubscription(results, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb();
                    });
                });
            },

            //get unsubscribed users:
            function (cb) {
                var query = DeviceModel.aggregate([{
                    $match: {
                        status: {
                            $ne: DEVICE_STATUSES.SUBSCRIBED
                        }
                    }
                }, {
                    $group: {
                        _id: "$user"
                    }
                }]);

                query.exec(function (err, rows) {
                    var userIds;

                    if (err) {
                        return cb(err);
                    }

                    userIds = _.pluck(rows, '_id');
                    cb(null, userIds);
                });
            },

            //set User.billings.subscribedDevices = 0 for users in userIds:
            function (userIds, cb) {
                var criteria = {
                    _id: {
                        $in: userIds
                    }
                };
                var update = {
                    $set: {
                        'billings.subscribedDevices': 0,
                        updatedAt: new Date()
                    }
                };

                UserModel.update(criteria, update, {multi: true}, function (err, result) {
                    if (err) {
                        return cb(err);
                    }
                    cb();
                });

            },

            //update the users.billings.subscribedDevices counter for subscribed users;
            function (cb) {

                var query = DeviceModel.aggregate([{
                    $match: {
                        status: DEVICE_STATUSES.SUBSCRIBED
                    }
                }, {
                    $group: {
                        _id: "$user",
                        count: {
                            $sum: 1
                        },
                        devices: {
                            $push: {
                                _id: "$_id"
                            }
                        }
                    }
                }]);

                query.exec(function (err, rows) {
                    if (err) {
                        return cb(err);
                    }

                    async.each(rows, updateSubscribedDevicesCount, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb();
                    });

                });
            }

        ], function (err, result) {
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

    this.startCronJobForNotifications = function (callback) {
        async.waterfall([

            // get devices:
            function (cb) {
                var now = new Date();
                var from = moment(now).add(9, 'd')._d;
                var to = moment(now).add(10, 'd')._d;
                var criteria = {
                    status: DEVICE_STATUSES.SUBSCRIBED,
                    "billings.renewEnabled": true,
                    "billings.expirationDate": {
                        $gte: from,
                        $lt: to
                    }
                };

                DeviceModel.find(criteria, function (err, devices) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, devices);
                });
            }

        ], function (err, result) {
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

    this.cron = function (req, res, next) {
        //self.startCronJob(function (err) {
        self.startCronJobForNotifications(function (err) {
            if (err) {
                return next(err);
            }
            res.status(200).send({success: 'success job'});
        });
    };

};

module.exports = DeviceHandler;