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
    var ObjectId = mongoose.Schema.Types.ObjectId;
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

    function subscribe(options, callback) {
        var userModel = options.userModel;
        var plan = options.plan;
        var token = options.token;
        var deviceIds = options.deviceIds;
        var deviceStringsIds = '';
        var isFree = (plan && (plan.amount === 0)) ? true : false;

        if (!isFree && !token) {
            return callback(badRequests.NotEnParams({reqParams: 'token'}));
        }

        deviceIds.forEach(function (deviceId) {
            deviceStringsIds += deviceId.toString() + ' ';
        });

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
                var planId;
                var quantity;
                var expirationDate;
                var description;
                var chargeParams;

                if (isFree) { // do nothing if free account
                    return cb(null, null);
                }

                planId = plan.plan_id.toString();
                quantity = plan.devicesToPay;
                expirationDate = plan.expirationDate;
                description = 'Minder charge for ' + userModel.email + '. Renew subscription for ' + quantity + ' devices. Plan: ' + plan.name + ', expirationDate: ' + expirationDate.toISOString();

                chargeParams = {
                    amount: plan.amount,  //price
                    source: token.id,
                    description: description,
                    metadata: {
                        planId: planId,
                        quantity: quantity,
                        expirationDate: expirationDate,
                        deviceIds: deviceStringsIds
                    }
                };

                stripeModule.createCharge(chargeParams, function (err, charge) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, charge);
                });
            }

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

    function recalcTheSubscribedDevicesCount(options, callback) {
        var userId;
        var plan;

        if (!options || !options.userId) {
            return badRequests.NotEnParams({reqParams: ['options.userId']});
        }

        userId = options.userId;
        plan = options.plan;

        async.waterfall([

            //group the subscribed devices:
            function (cb) {
                var criteria = {
                    user: userId,
                    status: DEVICE_STATUSES.SUBSCRIBED
                };

                DeviceModel.find(criteria).count(function (err, count) {
                    var userData;

                    if (err) {
                        return cb(err);
                    }

                    userData = {
                        _id: userId,
                        count: count
                    };

                    cb(null, userData);
                });

                /*DeviceModel
                 .aggregate([{
                 $match: {
                 user: userId, //userId
                 status: DEVICE_STATUSES.SUBSCRIBED
                 }
                 }, {
                 $group: {
                 _id: "$user",
                 count: {
                 $sum: 1
                 }
                 }
                 }])
                 .exec(function (err, results) {
                 if (err) {
                 return cb(err);
                 }
                 cb(null, results);
                 });*/
            },

            //update the User.billings data:
            function (userData, cb) {
                var criteria;
                var update;
                var updateData;

                if (!userData || !userData._id || (userData.count === undefined)) {
                    return badRequests.NotEnParams({reqParams: ['userData', 'userData._id', 'userData.count']});
                }

                updateData = {
                    "billings.subscribedDevices": userData.count,
                    updatedAt: new Date()
                };

                if (plan && plan.plan_id) {
                    updateData["billings.currentPlan"] = plan.plan_id;
                }

                if (plan && plan.period) {
                    updateData["billings.planPeriod"] = plan.period;
                }

                criteria = {
                    _id: userData._id
                };

                update = {
                    $set: updateData
                };

                UserModel.findOneAndUpdate(criteria, update, function (err, userModel) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, userModel);
                });
            }

        ], function (err, userModel) {
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

    function updateTheCurrentPlan(params, callback) {

        if (!params || (!params.userId && !params.userModel)) {
            if (callback && (typeof callback === 'function')) {
                callback(badRequests.NotEnParams({reqParams: 'params.userId | params.userModel'}));
            }
            return;
        }

        async.parallel({
            plans: function (cb) {

                if (params.plans) {
                    return cb(null, params.plans);
                }

                TariffPlan.find({}, function (err, plans) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, plans);
                })
            },
            userModel: function (cb) {

                if (params.userModel) {
                    return cb(null, params.userModel);
                }

                UserModel.findOne({
                    _id: params.userId
                }, function (err, user) {
                    if (err) {
                        cb(err);
                    } else if (!user) {
                        cb(badRequests.NotFound());
                    } else {
                        cb(null, user);
                    }
                });

            }
        }, function (err, results) {
            var userModel = results.userModel;
            var planModels = results.plans;
            var quantity = params.quantity || 0;

            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
                return;
            }

            async.waterfall([

                //recalculate the tariffPlan:
                function (cb) {
                    var calculateParams;

                    if (!quantity) {
                        return cb(null);
                    }

                    calculateParams = {
                        date: new Date(),
                        plans: planModels,
                        period: params.period || userModel.billings.planPeriod,
                        user: userModel,
                        selectedDevicesCount: quantity
                    };

                    calculateTariff(calculateParams, function (err, plan) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, plan);
                    });

                },

                // update the User.billings.currentPlan:
                function (plan, cb) {

                    if (!plan || !plan.plan_id) {
                        return cb(badRequests.NotFound({message: "Can't find the users plan"}));
                    }

                    userModel.billings.currentPlan = plan.plan_id;
                    userModel.billings.subscribedDevices += quantity;

                    userModel.save(function (err, updatedUser) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, updatedUser);
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
        });
    };

    this.updateStatus = function (req, res, next) { // active - 1 / deleted - 0
        var userId = req.session.userId;
        var deviceId = req.params.id;
        var options = req.body;
        var deviceStatus = options.status;

        if (deviceStatus === undefined) {
            return next(badRequests.NotEnParams({reqParams: 'status'}));
        }

        if ((deviceStatus !== DEVICE_STATUSES.ACTIVE) && (deviceStatus !== DEVICE_STATUSES.DELETED)) {
            return next(badRequests.InvalidValue({param: 'status'}));
        }

        async.waterfall([

            //find the device:
            function (cb) {
                var criteria = {
                    _id: deviceId
                };

                if (!session.isAdmin(req)) {
                    criteria.user = userId;
                }

                DeviceModel.findOne(criteria, function (err, device) {

                    if (err) {
                        return cb(err);
                    } else if (!device) {
                        return cb(badRequests.NotFound());
                    }

                    cb(null, device);
                });
            },

            //update the device:
            function (deviceModel, cb) {
                var oldDeviceStatus = deviceModel.status;

                deviceModel.status = deviceStatus;
                deviceModel.save(function (err, updatedDevice) {
                    if (err) {
                        return cb(err);
                    }
                    return cb(null, oldDeviceStatus, updatedDevice);
                });
            },

            //check is device was subscribed:
            function (oldDeviceStatus, updatedDeviceModel, cb) {
                var updateParams;

                if (oldDeviceStatus === DEVICE_STATUSES.SUBSCRIBED) {

                    updateParams = {
                        userId: updatedDeviceModel.user.toString(),
                        quantity: -1 //decrement the subscribed devices counter;
                    };

                    updateTheCurrentPlan(updateParams, function (err, user) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, updatedDeviceModel);
                    });

                } else {
                    cb(null, updatedDeviceModel);
                }
            }

        ], function (err, updatedDevice) {
            if (err) {
                return next(err);
            }
            res.status(200).send(updatedDevice);
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
                callback(null, plan);
            });
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

            checkActiveDevices: function (cb) {
                var criteria = {
                    user: userId,
                    status: {
                        $ne: DEVICE_STATUSES.DELETED
                    },
                    _id: {
                        $in: deviceIds
                    }
                };
                var fields = '_id';

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
            var userModel = results.user;
            var planModels = results.plans;
            var activeDeviceIds = results.checkActiveDevices;

            if (err) {
                return next(err);
            }

            async.waterfall([

                //recalculate the users plan:
                function (cb) {
                    var calculationOptions = {
                        user: userModel,
                        quantity: activeDeviceIds.length,
                        plans: planModels,
                        period: period
                    };

                    self.getUserTariffPlan(calculationOptions, function (err, plan) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, plan);
                    });
                },

                //subscription:
                function (plan, cb) {
                    var subscriptionOptions = {
                        userModel: userModel,
                        plan: plan,
                        token: token,
                        deviceIds: activeDeviceIds
                    };

                    subscribe(subscriptionOptions, function (err, subscriptionResult) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, subscriptionResult, plan);
                    });
                },

                //update Devices.billings: (status, subscriptionId, expirationDate, ...)
                function (subscriptionResult, plan, cb) {
                    var subscriptionId = (subscriptionResult && subscriptionResult.id) ? subscriptionResult.id : null;
                    var now = new Date();
                    var criteria = {
                        user: userId,
                        _id: {
                            $in: activeDeviceIds
                        }
                    };
                    var update = {};
                    var freeAccount = false;

                    if (!plan.amount) {
                        freeAccount = true;
                    }

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
                        cb(null, plan);
                    });
                },

                //update User.billings data:
                function (plan, cb) {
                    var params = {
                        userId: userId,
                        plan: plan
                    };

                    recalcTheSubscribedDevicesCount(params, function (err, userModel) {
                        if (err) {
                            return cb(err);
                        }
                        cb();
                    });
                }

            ], function (err, result) {
                if (err) {
                    return next(err);
                }
                res.status(200).send({success: 'subscribed'});
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
                var updateParams;

                if (!updatedDevicesCount) {
                    return cb(null, null);
                }

                updateParams = {
                    userId: userId,
                    quantity: ( -1 ) * updatedDevicesCount
                };

                updateTheCurrentPlan(updateParams, function (err, userModel) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, userModel);
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
                    expirationDate = new Date(date.setMonth(date.getMonth() + 1));
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
                                _id: "$_id"
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

    function checkExpirationDateForNotifications(daysBefore, callback) {

        async.waterfall([

            // get devices:
            function (cb) {
                var now = new Date();
                var from = new Date();
                var to = new Date();
                var criteria;
                var query;

                /*var fromMoment = moment(now).add(10, 'd').hours(0).minutes(0);
                 var toMoment = moment(now).add(11, 'd').hours(0).minutes(0);
                 var from = fromMoment._d;
                 var to = toMoment._d;*/
                //05-06-2015 :
                from.setDate(now.getDate() + daysBefore - 1);
                from.setHours(0);
                from.setMinutes(0);

                to.setDate(now.getDate() + daysBefore);
                to.setHours(0);
                to.setMinutes(0);

                if (process.env.NODE_ENV !== 'production') {
                    console.log('>>> billings.expirationDate between: %s AND %s', from.toISOString(), to.toISOString());
                }

                criteria = {
                    status: DEVICE_STATUSES.SUBSCRIBED,
                    //"billings.renewEnabled": false, //TODO: use it affter tests
                    "billings.expirationDate": {
                        $gte: from,
                        $lte: to
                    }
                };

                /*query = DeviceModel.aggregate([{
                 $match: criteria
                 }, {
                 $group: {
                 _id: "$user",
                 devices: {
                 $push: {
                 _id: "$_id",
                 expirationDate: "$billings.expirationDate",
                 user: "$user"
                 }
                 }
                 }
                 }]);*/

                query = DeviceModel.find(criteria, {"billings.expirationDate": 1, user: 1});

                query.exec(function (err, result) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, result);
                });
            }/*,

             //send email notification:
             function (users, cb) {
             async.each(users, function (userData, eachCb) {
             eachCb();
             }, function (err) {
             if (err) {
             return cb(err);
             }
             cb(null, users);
             });
             }*/

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

    this.startCronJobForNotifications = function (callback) {
        async.parallel([

            function (cb) {
                checkExpirationDateForNotifications(10, function (err, devices) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, devices);
                });
            },

            function (cb) {
                checkExpirationDateForNotifications(3, function (err, devices) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, devices);
                });
            },

            function (cb) {
                checkExpirationDateForNotifications(1, function (err, devices) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, devices);
                });
            }

        ], function (err, results) {
            var nowMoment = moment();
            var users;
            var data;

            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
                return;
            }

            data = _.union(results[0], results[1], results[2]);
            data = _.map(data, function (deviceModel) {
                var deviceJSON = deviceModel.toJSON();
                var expDate = moment(deviceJSON.billings.expirationDate);
                var diff = expDate.diff(nowMoment, 'd');

                deviceJSON['daysDiff'] = diff;

                return deviceJSON;
            });

            users = _.groupBy(data, 'user');

            async.waterfall([

                //map users:
                function (cb) {

                    async.each(
                        Object.keys(users),
                        function (user, eachCb) {
                            var devices = _.groupBy(users[user], 'daysDiff');

                            users[user] = devices;

                            eachCb();
                        }, function (err) {
                            if (err) {
                                return cb(err);
                            }
                            cb(null, users);
                        });
                },

                //send mail notification:
                function (users, cb) {
                    //TODO: ...
                    cb(null, users);
                }
            ], function (err, users) {
                if (err) {
                    if (callback && (typeof callback === 'function')) {
                        callback(err);
                    }
                } else {
                    if (callback && (typeof callback === 'function')) {
                        callback(null, users);
                    }
                }
            });

        });
    };

    this.cron = function (req, res, next) {
        //self.startCronJob(function (err) {

        var days = req.query.days || 10;

        /*checkExpirationDateForNotifications(days, function (err, result) {
         if (err) {
         return next(err);
         }
         res.status(200).send({success: 'success job', result: result});
         });*/

        self.startCronJobForNotifications(function (err, result) {
            if (err) {
                return next(err);
            }
            res.status(200).send({success: 'success job', result: result});
        });
    };

};

module.exports = DeviceHandler;