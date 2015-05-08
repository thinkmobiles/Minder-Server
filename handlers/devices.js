'use strict';
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

        if (data && data.deviceName) {
            deviceData.deviceName = data.deviceName;
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

        async.waterfall([

            //check is exists customer in stripe and create if need:
            function (cb) {
                var stripeId = userModel.billings.stripeId;
                var customerData;

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


                var chargeParams = {
                    amount: plan.costForThisMonth * 100,  //price // TODO
                    source: token.id,
                    description: 'Charge for ' + user.email + ' plan T1',
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
                    cb(null, user, charge);
                });
            },

        ], function (err, result) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
                return;
            }
            if (callback && (typeof callback === 'function')) {
                callback(null, result);
            }
        });
    };

    function updateStatusToSubscribed(userId, deviceIds, callback) {
        async.waterfall([

            //update devices status = "subscribed":
            function (cb) {
                var criteria = {
                    user: userId,
                    status: DEVICE_STATUSES.ACTIVE,
                    _id: {
                        $in: deviceIds
                    }
                };
                var update = {
                    status: DEVICE_STATUSES.SUBSCRIBED
                };

                DeviceModel.update(criteria, update, {multi: true}, function (err, quantity) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, quantity);
                });

            },

            //update user.billings.subscribedDevices:
            function (quantity, cb) {
                self.incrementSubscribedDevicesCount(userId, quantity, function (err, updatedUser) {
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
        'use strict';

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
        'use strict';

        var options = req.body;
        var criteria;
        var update;

        if (!options.deviceId || !options.location || !options.location.long || !options.location.lat) {
            return next(badRequests.NotEnParams({reqParams: ['deviceId', 'location', 'location.long', 'location.lat']}));
        }

        criteria = {
            deviceId: options.deviceId
        };
        update = {
            lastLocation: {
                long: options.location.long,
                lat: options.location.lat,
                dateTime: new Date()
            }
        };

        DeviceModel
            .findOneAndUpdate(criteria, update, function (err, device) {
                if (err) {
                    return next(err);
                }

                if (!device) {
                    return next(badRequests.NotFound());
                }

                res.status(200).send({success: 'updated'});
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

        if ((params.status === DEVICE_STATUSES.ACTIVE) ||
            (params.status === DEVICE_STATUSES.SUBSCRIBED) ||
            (params.status === DEVICE_STATUSES.DELETED)) {
            criteria.status = params.status;
        }

        DeviceModel.find(criteria, 'name status _id')
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

        if (params.status === 'subscribed') {
            criteria.status = 'subscribed';
        } else if (params.status === 'active') {
            criteria.status = 'active';
        } else if (params.status === 'deleted') {
            criteria.status = 'deleted';
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

    this.updateStatus = function (req, res, next) {
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
            var oldStatus;

            if (err) {
                return next(err);
            }
            if (!device) {
                return next(badRequests.NotFound());
            }

            oldStatus = device.status;

            device.status = deviceStatus;
            device.save(function (err, updatedDevice) {
                var ownerId;

                if (err) {
                    return next(err);
                }
                if (!updatedDevice) {
                    return next(badRequests.NotFound());
                }

                if (oldStatus === DEVICE_STATUSES.SUBSCRIBED) {
                    ownerId = device.user.toString();

                    self.incrementSubscribedDevicesCount(ownerId, -1, function (err) {
                        if (err) {
                            if (process.env.NODE_ENV !== 'production') {
                                console.error(err);
                                logWriter.log('handlers.js setStatusDeleted() -> userHandler.incrementSubscribedDevicesCount', err.stack);
                            }
                        }
                    })
                }

                res.status(200).send(updatedDevice);
            });

        });
    };

    this.incrementSubscribedDevicesCount = function (userId, quantity, callback) {
        var criteria = {
            _id: userId
        };
        var update = {
            $inc: {
                'billings.subscribedDevices': quantity
            }
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
        var requiredParameters = ['token', 'deviceIds', 'period'];

        if (!token) {
            return next(badRequests.NotEnParams({reqParams: requiredParameters}));
        }

        if (!deviceIds || deviceIds.length === 0) {
            return next(badRequests.NotEnParams({reqParams: requiredParameters}));
        }

        if (!period) {
            return next(badRequests.NotEnParams({reqParams: requiredParameters}));
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
                    status: DEVICE_STATUSES.SUBSCRIBED,
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
            },

            checkActiveDevices: function (cb) {
                var criteria = {
                    user: userId,
                    status: DEVICE_STATUSES.ACTIVE,
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
                        activeIds = _.pluck(devices, '_id');
                        cb(null, activeIds);
                    }
                });
            }

        }, function (err, results) {
            var userModel = results.user;
            var plans = results.plans;
            var activeDeviceIds = results.checkActiveDevices;
            var calculateParams;

            if (err) {
                return next(err);
            }

            calculateParams = {
                date: new Date(),
                plans: plans,
                period: period,
                user: userModel,
                selectedDevicesCount: deviceIds.length //TODO: devicesCount
            };

            calculateTariff(calculateParams, function(err, plan){
                if(err){
                    return next(err);
                }
                async.waterfall([

                    //subscription:
                    function (cb) {
                        subscribe(userModel, plan, token, function (err, subscriptionResult) {
                            if (err) {
                                return cb(err);
                            }
                            cb(null, subscriptionResult);
                        });
                    },

                    //update Devices.status to "subscribed" and User.billings.subscribedDevices
                    function (subscriptionResult, cb) {
                        updateStatusToSubscribed(userId, activeDeviceIds, function (err, user) {
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
                    status: DEVICE_STATUSES.ACTIVE
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

                self.incrementSubscribedDevicesCount(userId, quantity, function (err, userModel) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, userModel);
                });
            }

        ], function (err, userModel, updatedDevicesCount) {
            if (err) {
                return next(err);
            }

            res.status(200).send({success: 'unsubscribed'});
        });

    };

};

module.exports = DeviceHandler;