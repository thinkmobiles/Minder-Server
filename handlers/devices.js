'use strict';

var RESPONSES = require('../constants/responses');
var DEVICE_OS = require('../constants/deviceOs');
var DEVICE_STATUSES = require('../constants/deviceStatuses');
var PLAN_TYPES = require('../constants/planTypes');
var DEVICE_FIELDS = '_id deviceId deviceType name user status lastLocation geoFence sync createdAt updatedAt';

var util = require('util');
var _ = require('lodash');
var async = require('async');
var mongoose = require('mongoose');
var badRequests = require('../helpers/badRequests');
var logWriter = require('../helpers/logWriter')();
var SessionHandler = require('../handlers/sessions');

var calculateTariff = require('../public/js/libs/costCounter_2');
var moment = require('moment');
var stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
var mailer = require('../helpers/mailer');
var schedule = require('node-schedule');

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
            deviceData.name = data.deviceName;
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
                callback(badRequests.NotEnParams({ reqParams: ['deviceId', 'deviceName'] }));
            }
            return;
        }
        
        if (callback && (typeof callback === 'function')) {
            callback();
        }
    };
    
    function updateTheCurrentPlan(params, callback) {
        
        if (!params || (!params.userId && !params.userModel)) {
            if (callback && (typeof callback === 'function')) {
                callback(badRequests.NotEnParams({ reqParams: 'params.userId | params.userModel' }));
            }
            return;
        }
        
        async.parallel({
            
            //find all plans from db or use params.plans:
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
            
            //find the userModel from db or use params.userModel:
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
            
            userModel.billings.subscribedDevices += quantity;
            
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
                    
                    calculateParams = {
                        now: new Date(),
                        plans: planModels,
                        period: params.period || userModel.billings.planPeriod,
                        user: userModel
                    };
                    
                    calculateTariff(calculateParams, function (err, calcResult) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, calcResult);
                    });

                },

                // update the User.billings.currentPlan:
                function (calcResult, cb) {
                    
                    //if (!plan || !plan.plan_id) {
                    if (!calcResult || !calcResult.planModel || !calcResult.planModel._id) {
                        return cb(badRequests.NotFound({ message: "Can't find the users plan" }));
                    }
                    
                    //userModel.billings.currentPlan = plan.plan_id;
                    userModel.billings.currentPlan = calcResult.planModel._id;
                    //userModel.billings.subscribedDevices = subscribedDevicesCount;
                    
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
    
    function checkStripeId(userModel, callback) {
        
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
                        }
                    };
                    
                    stripe.customers.create(customerData, function (err, customer) {
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
    
    function subscribe(options, callback) {
        var userModel = options.userModel;
        var calcResult = options.calcResult;
        var token = options.token;
        var deviceIds = options.deviceIds;
        var deviceStringsIds = '';
        var isFree = (calcResult && (calcResult.amount === 0)) ? true : false;
        
        if (!isFree && !token) {
            return callback(badRequests.NotEnParams({ reqParams: 'token' }));
        }
        
        deviceIds.forEach(function (deviceId) {
            deviceStringsIds += deviceId.toString() + ' ';
        });
        
        async.waterfall([
            
            //TODO: ... use checkStripeId. Don't forget about if (isFree) { ,,

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
                    
                    stripe.customers.create(customerData, function (err, customer) {
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
                var planModel;
                
                if (isFree) { // do nothing if free account
                    return cb(null, null);
                }
                
                expirationDate = calcResult.expirationDate;
                planModel = calcResult.planModel;
                planId = planModel._id.toString();
                quantity = calcResult.devicesToPay;
                description = 'Minder charge for ' + userModel.email + '. Subscription for ' + quantity + ' devices. Plan: ' + planModel.name;
                
                var subscriptionParams = {
                    plan: planId,
                    source: token.id,
                    quantity: quantity,
                    metadata: {
                        description: description,
                        quantity: quantity,
                        expirationDate: expirationDate,
                        deviceIds: deviceStringsIds
                    }
                };
                
                stripe.customers.createSubscription(userModel.billings.stripeId, subscriptionParams, function (err, charge) {
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
        var calcResult;
        var planModel;
        
        if (!options || !options.userId) {
            return badRequests.NotEnParams({ reqParams: ['options.userId'] });
        }
        
        userId = options.userId;
        //plan = options.plan;
        calcResult = options.calcResult;
        
        if (calcResult && calcResult.planModel && calcResult.planModel._id) {
            planModel = calcResult.planModel;
        }
        
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
            },

            //update the User.billings data:
            function (userData, cb) {
                var criteria;
                var update;
                var updateData;
                
                if (!userData || !userData._id || (userData.count === undefined)) {
                    return badRequests.NotEnParams({ reqParams: ['userData', 'userData._id', 'userData.count'] });
                }
                
                updateData = {
                    "billings.subscribedDevices": userData.count,
                    updatedAt: new Date()
                };
                
                if (planModel) {
                    updateData["billings.currentPlan"] = planModel._id;
                    updateData["billings.planPeriod"] = planModel.metadata.type;
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
    
    function updateSubscribedDevicesCount(options, callback) {
        //TODO: FIXME: re-calc the tariff plan:
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
            
            DeviceModel.update(criteria, update, { multi: true }, function (err, devices) {
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
                
                var subscriptionParams = {
                    plan: planId,
                    quantity: quantity,
                    metadata: {
                        description: description,
                        quantity: quantity,
                        expirationDate: expirationDate,
                        deviceIds: deviceStringsIds
                    }
                };
                
                stripe.customers.createSubscription(userModel.billings.stripeId, subscriptionParams, function (err, charge) {
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
                
                DeviceModel.update(criteria, update, { multi: true }, function (err, devices) {
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

            //get the all tariff plans:
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
    
    function sendExpiredNotifications(deviceModels, callback) {
        var users;
        var userIds;
        
        if (!deviceModels || !deviceModels.length) {
            if (callback && (typeof callback === 'function')) {
                callback();
            }
            return;
        }
        
        users = _.groupBy(deviceModels, 'user');
        userIds = Object.keys(users);
        
        async.waterfall([

            //find the users:
            function (cb) {
                var criteria = {
                    _id: {
                        $in: userIds
                    }
                };
                var fields = {
                    email: 1,
                    firstName: 1,
                    lastName: 1
                };
                
                UserModel.find(criteria, fields, function (err, userModels) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, userModels);
                });
            },

            //map users and send notification:
            function (userModels, cb) {
                async.map(userModels, function (userModel, mapCb) {
                    var userJSON = userModel.toJSON();
                    
                    userJSON.devices = users[userJSON._id];
                    mailer.onExpired(userJSON);
                    
                    return mapCb(null, userJSON);

                }, function (err, userData) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, userData);
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
    
    function checkExpirationDateForNotifications(daysBefore, callback) {
        var now = new Date();
        var from = new Date();
        var to = new Date();
        var criteria;
        var fields = {
            _id: 0,
            name: 1,
            user: 1,
            "billings.expirationDate": 1
        };
        var query;
        
        from.setDate(now.getDate() + daysBefore);
        from.setHours(0);
        from.setMinutes(0);
        
        to.setDate(now.getDate() + daysBefore + 1);
        to.setHours(0);
        to.setMinutes(0);
        
        if (process.env.NODE_ENV !== 'production') {
            console.log('>>> billings.expirationDate between: %s AND %s', from.toISOString(), to.toISOString());
        }
        
        criteria = {
            status: DEVICE_STATUSES.SUBSCRIBED,
            "billings.renewEnabled": false,
            "billings.expirationDate": {
                $gte: from,
                $lte: to
            }
        };
        
        query = DeviceModel.find(criteria, fields);
        
        query.exec(function (err, result) {
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
    
    function unsubscribeOnStripe(customerId, subscriptionIds, callback) {
        var ids = _.uniq(subscriptionIds);

        async.each(ids, function (subscriptionId, cb) {
                stripe.customers.cancelSubscription(customerId, subscriptionId, function (err, confirmation) {
                    if (err) {
                        if (process.env.NODE_ENV !== 'production') { 
                            console.error(err);
                        }
                    }
                    cb();
                });
            }, function (err) {
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

    function unsubscribeGeoFencePack(userId, deviceId, callback) {
        
        async.waterfall([
            
            //find the device:
            function (cb) {
                var criteria = {
                    _id: deviceId
                };

                DeviceModel
                    .findOne(criteria)
                    .populate('user')
                    .exec(function (err, device) {
                        if (err) {
                            return cb(err);
                        } else if (!device) {
                            cb(badRequests.NotFound({message: RESPONSES.DEVICE_WAS_NOT_FOUND})); 
                        } else {
                            cb(null, device);
                        }
                });
            },

            //cancel the subscription on stripe (There are max. 25 active subscriptions / customer): 
            //https://groups.google.com/a/lists.stripe.com/forum/#!topic/api-discuss/hcJGxd_n7qc
            function(deviceModel, cb) {
                var user;
                var stripeId;
                var subscriptionId;
                var subscriptionIds;

                if (!deviceModel.geoFence || (deviceModel.geoFence.status === undefined)) { 
                    return cb(badRequests.InvalidValue({message: 'geoFence was not defined for the deviceModel'}));
                }
                
                if (deviceModel.geoFence.status !== DEVICE_STATUSES.SUBSCRIBED || !deviceModel.geoFence.subscriptionId) { 
                    return cb(null, deviceModel); //the device is not subscribed;
                }
                
                user = deviceModel.user;
                stripeId = user.billings.stripeId;
                subscriptionId = deviceModel.geoFence.subscriptionId;
                subscriptionIds = [subscriptionId];

                unsubscribeOnStripe(stripeId, subscriptionIds, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, deviceModel);
                });
            },
            
            //update the device model:
            function (deviceModel, cb) {
                var criteria = {
                    _id: deviceId
                };
                var update = {
                    $set: {
                        'geoFence.status': DEVICE_STATUSES.ACTIVE,
                        updatedAt: new Date()
                    }
                };
                var fields = DEVICE_FIELDS;

                DeviceModel.findOneAndUpdate(criteria, update, fields, function (err, deviceModel) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, deviceModel);
                });
            }

        ], function (err, deviceModel) { 
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
            } else {
                if (callback && (typeof callback === 'function')) {
                    callback(null, deviceModel);
                }
            }
        });
    };
    
    this.validateDeviceData = validateDeviceData;
    
    this.prepareDeviceData = prepareDeviceData;
    
    this.getDeviceOS = function (req) {
        var userAgent = req.headers['user-agent'].toLowerCase();
        
        if ((userAgent.indexOf('iphone') !== -1) || (userAgent.indexOf('darwin/14') !== -1) || (userAgent.indexOf('ipad') !== -1) || (userAgent.indexOf('ipod') !== -1)) {
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
    
    this.createDevice = function (deviceData, userModel, callback) {
        
        async.waterfall([
            
            //create a new device:
            function (cb) {
                var newDevice = new DeviceModel(deviceData);

                newDevice.user = userModel._id;
                newDevice.save(function (err, deviceModel) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, deviceModel);
                });
            },
        
            //update user.devices:
            function (deviceModel, cb) {
                
                userModel.devices.push(deviceModel);
                userModel.save(function (err, user) {
                    if (err) { 
                        return cb(err);
                    }
                    cb(null, deviceModel);
                });

            }

        ], function (err, deviceModel) {
            if (err) {
                if (callback && (typeof callback) === 'function') {
                    callback(err);
                }
            } else { 
                if (callback && (typeof callback) === 'function') {
                    callback(null, deviceModel);
                }
            }
        });
    };
    
    function saveTheLocationAndCheckGeoFence(deviceModel, location, callback) {
        var owner;

        async.waterfall([
            
            //find the devices owner:
            function (cb) { 
                var userId = deviceModel.user;
                UserModel.findById(userId, function (err, userModel) {
                    if (err) {
                        return cb(err);
                    }
                    owner = userModel;
                    cb();
                });
            
            },

            //save the location:
            function (cb) {
                var criteria = {
                    _id: deviceModel._id
                };
                var update = {
                    $set: {
                        lastLocation: {
                            coordinates: [location.long, location.lat],
                            dateTime: new Date()
                        }
                    }
                };

                DeviceModel.findOneAndUpdate(criteria, update, function (err, model) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, model);
                });
            },
            
            //check the geo fence:
            function (updatedDevice, cb) {
                var centerLong = updatedDevice.geoFence.fixedLocation.long;
                var centerLat = updatedDevice.geoFence.fixedLocation.lat;
                var radius = updatedDevice.geoFence.radius;
                var criteria = {
                    _id: updatedDevice._id,
                    "lastLocation.coordinates": {
                        $nearSphere: {
                            $geometry: {
                                type: "Point",
                                coordinates: [centerLong, centerLat]
                            },
                            $maxDistance: radius
                        }
                    }
                };
                                
                if (!updatedDevice.geoFence.enabled || (updatedDevice.geoFence.status !== DEVICE_STATUSES.SUBSCRIBED)) { 
                    return cb(null, updatedDevice, null); //don't need track geo fence:
                }

                DeviceModel.findOne(criteria, function (err, device) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, updatedDevice, device);
                });
            }, 
            
            //track leaving, entering:
            function (updatedDevice, geoDevice, cb) {
                var message;
                var withinFence = updatedDevice.geoFence.withinFence;
                var newWithinFence;

                if (!updatedDevice.geoFence.enabled || (updatedDevice.geoFence.status !== DEVICE_STATUSES.SUBSCRIBED)) {
                    return cb(null, updatedDevice, RESPONSES.SET_LOCATION); //don't need track geo fence:
                }
                
                if (withinFence && geoDevice) { //not leaved, not returned;
                    //the updatedDevice.geoFence.withinFence is not changed;
                    message = RESPONSES.SET_LOCATION;
                }
                
                if (!withinFence && !geoDevice) { //leaved but not returned;
                    //the updatedDevice.geoFence.withinFence is not changed;
                    message = RESPONSES.SET_LOCATION;
                }
                
                if (withinFence && !geoDevice) { //leave the fence;
                    newWithinFence = false;
                    message = RESPONSES.GEO_FENCE_LEAVE;
                
                }
                
                if (!withinFence && geoDevice) { //returned;
                    newWithinFence = true;
                    message = RESPONSES.GEO_FENCE_RETURN;
                }
                
                if (newWithinFence === undefined) { 
                    return cb(null, updatedDevice, message); //dont need to update the device.geoFence
                }
                
                //update the device:
                updatedDevice.geoFence.withinFence = newWithinFence;
                updatedDevice.save(function (err, model) {
                    if (err) {
                        return cb(err);
                    }
                    mailer.geoFence({user: owner, device: model});
                    cb(null, model, message);
                });
                
            }

        ], function (err, updatedDevice, message) {
            if (err) { 
                return callback(err);
            }
            
            callback(null, updatedDevice, message); //TODO: change results.withinFence (if need notififcation)
        });
    };

    this.setLocation = function (req, res, next) {
        var options = req.body;
        var criteria = {}; // find criteria
        
        if (!options.deviceId || !options.location || !options.location.long || !options.location.lat) {
            return next(badRequests.NotEnParams({ reqParams: ['deviceId', 'location', 'location.long', 'location.lat'] }));
        }
        
        criteria.deviceId = options.deviceId; // set device to find
        
        DeviceModel.findOne(criteria, function (err, device) {
            if (err) {
                return next(err);
            } else if (!device) {
                
                // wrong deviceId response
                return next(badRequests.NotFound());
            } else {
                //console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
                //console.log(device);
                //console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
                // if subscribed - update device location
                if (device.status !== DEVICE_STATUSES.SUBSCRIBED) {
                    // reject update location
                    return next(badRequests.PaymentRequired());
                }
                
                
                saveTheLocationAndCheckGeoFence(device, options.location, function (err, updatedDevice, message) {
                    if (err) {
                        return next(err);
                    }
                    res.status(200).send({ success: true, message: message });
                });
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
            return next(badRequests.NotEnParams({ reqParams: ['deviceIds'] }));
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
            skip = (page - 1) * count;
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
            skip = (params.page - 1) * params.count;
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
        
        DeviceModel.count(criteria)
            .exec(function (err, devices) {
            if (err) {
                return next(err);
            }
            res.status(200).send({ count: devices });
        });
    };
    
    this.getDevice = function (req, res, next) {
        var userId = req.session.userId;
        var id = req.params.id;
        var criteria = {
            _id: id
        };
        
        DeviceModel
            .findOne(criteria, DEVICE_FIELDS, function (err, deviceModel) {
            var ownerId;
            
            if (err) {
                next(err);
            } else if (!deviceModel) {
                next(badRequests.NotFound());
            } else {
                
                if (!deviceModel.user) {
                    return next(badRequests.InvalidValue({ param: 'device.user', value: deviceModel.user }));
                }
                
                ownerId = deviceModel.user.toString();
                
                if (session.isAdmin(req) || (ownerId === userId)) {
                    res.status(200).send(deviceModel);
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
        var geoFence = options.geoFence;
        var sync = options.sync;
        var criteria = {
            _id: id
        };
        var update = {
            $set: {
            }
        };
        
        //check permissions:
        if (!session.isAdmin(req)) {
            criteria.user = userId;
        }

        if (options.name) {
            update.$set['name'] = options.name;
        }
        
        if (geoFence) {
            if ((geoFence.enabled !== undefined)) {
                update.$set['geoFence.enabled'] = geoFence.enabled;
            }
            
            if (geoFence && geoFence.fixedLocation && (geoFence.fixedLocation.long !== undefined)) {
                update.$set['geoFence.fixedLocation.long'] = geoFence.fixedLocation.long;
            }
            
            if (geoFence && geoFence.fixedLocation && (geoFence.fixedLocation.lat !== undefined)) {
                update.$set['geoFence.fixedLocation.lat'] = geoFence.fixedLocation.lat;
            }
            
            if (geoFence.radius !== undefined) {
                update.$set['geoFence.radius'] = geoFence.radius;
            }
        }
        
        if (sync) {
            if (sync.enabled !== undefined) { 
                update.$set['sync.enabled'] = sync.enabled;
            }
        }

        if (!Object.keys(update.$set).length) {
            return next(badRequests.NotEnParams({ message: 'There are no params for update.' }));
        }
        
        update.$set.updatedAt = new Date();
        
        DeviceModel
            .findOneAndUpdate(criteria, update)
            .exec(function (err, device) {
            if (err) {
                next(err);
            } else if (!device) {
                next(badRequests.NotFound());
            } else {
                res.status(200).send({ success: 'updated', model: device });
            }
        });
        
    };
    
    this.updateGeoFence = function (req, res, next) {
        var options = req.body;
        var userId = req.session.userId;
        var id = req.params.id;
        var geoFence = options.geoFence;
        var criteria = {
            _id: id
        };
        var update = {
            $set: {
            }
        };
        
        if (!geoFence) {
            return next(badRequests.NotEnParams({ reqParams: 'geoFence' }));
        }
        
        if (geoFence.enabled !== undefined) {
            update.$set['geoFence.enabled'] = geoFence.enabled;
        }
        
        if (geoFence.fixedLocation && (geoFence.fixedLocation.long !== undefined)) {
            update.$set['geoFence.fixedLocation.long'] = geoFence.fixedLocation.long;
        }
        
        if (geoFence.fixedLocation && (geoFence.fixedLocation.lat !== undefined)) {
            update.$set['geoFence.fixedLocation.lat'] = geoFence.fixedLocation.lat;
        }
        
        if (geoFence.radius !== undefined) {
            update.$set['geoFence.radius'] = geoFence.radius;
        }
        
        if (!Object.keys(update.$set).length) {
            return next(badRequests.NotEnParams({ message: 'There are no params for update.' }));
        }
        
        if (!session.isAdmin(req)) {
            criteria.user = userId; //check permissions
        }
        
        update.$set.updatedAt = new Date();
        
        DeviceModel
            .findOneAndUpdate(criteria, update)
            .exec(function (err, device) {
            if (err) {
                next(err);
            } else if (!device) {
                next(badRequests.NotFound());
            } else {
                res.status(200).send({ success: 'updated', model: device });
            }
        });

    };
    
    this.updateStatus = function (req, res, next) { // active - 1 / deleted - 0
        var userId = req.session.userId;
        var deviceId = req.params.id;
        var options = req.body;
        var deviceStatus = options.status;
        
        if (deviceStatus === undefined) {
            return next(badRequests.NotEnParams({ reqParams: 'status' }));
        }
        
        if ((deviceStatus !== DEVICE_STATUSES.ACTIVE) && (deviceStatus !== DEVICE_STATUSES.DELETED)) {
            return next(badRequests.InvalidValue({ param: 'status' }));
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
                
                DeviceModel
                    .findOne(criteria)
                    .populate('user')
                    .exec(function (err, deviceModel) {
                        if (err) {
                            return cb(err);
                        } else if (!deviceModel) {
                            return cb(badRequests.NotFound());
                        }
                        cb(null, deviceModel);
                    });
            },

            //check the current status and unsubscribe on stripe if need;
            function (deviceModel, cb) {
                var findParams;

                if (deviceModel.status !== DEVICE_STATUSES.SUBSCRIBED || !deviceModel.billings.subscriptionId) { 
                    return cb(null, deviceModel);
                }
                
                findParams = {
                    deviceIds: [deviceId]
                };
                findSubscriptionIdsToUnsubscribe(findParams, function (err, subscriptionIds) {
                    var userModel;
                    var customerId;

                    if (err) {
                        return cb(err);
                    }

                    userModel = deviceModel.user;
                    customerId = userModel.billings.stripeId;
                    unsubscribeOnStripe(customerId, subscriptionIds, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, deviceModel);
                    });
                });
            },

            //update the device:
            function (deviceModel, cb) {
                var oldDeviceStatus = deviceModel.status;
                
                if (deviceStatus === DEVICE_STATUSES.DELETED) {
                    deviceModel.billings.subscriptionId = null;
                    deviceModel.billings.expirationDate = null;
                }
                
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
                        userModel: updatedDeviceModel.user,
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
            var calculateParams = options;
            var quantity = options.quantity || 0;
            
            if (err) {
                return callback(err);
            }
           
            calculateTariff(calculateParams, function (err, calcResult) {
                if (err) {
                    return callback(err);
                }
                callback(null, calcResult);
            });
        });
    };
    
    function findSubscriptionIdsToUnsubscribe(params, callback) {
        var userId = params.userId;
        var deviceIds = params.deviceIds;
        var deviceObjectIds = deviceIds.toObjectId();
        var user;
        var devicesCriteria = {
            'billings.subscriptionId': { $ne: null },
            'status': DEVICE_STATUSES.SUBSCRIBED
        };
        
        if (userId) {
            user = ObjectId(userId);
            devicesCriteria['user'] = userId;
        }

        DeviceModel.aggregate([
            {
                $match: devicesCriteria
            }, {
                $group: {
                    _id: "$billings.subscriptionId", 
                    devices: { $push: "$_id" }
                }
            }, {
                $match: {
                    devices: { $in: deviceObjectIds }
                }
            }
        ]).exec(function (err, subscriptions) {
            var subscriptionIds;
            var activeDevices;
            var subscriptionObjects;

            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
                return;
            }
             
            subscriptionObjects = _.filter(subscriptions, function (_subscr) {
                var _devices = _subscr.devices;
                var strDeviceIds = _devices.toStringObjectIds();
                var isActive = function (id) {
                    var _find = (deviceIds.indexOf(id) !== -1);
                    return _find;
                };
                var _every = strDeviceIds.every(isActive);

                return _every;
            });
                
            subscriptionIds = _.pluck(subscriptionObjects, '_id');

            if (callback && (typeof callback === 'function')) {
                callback(null, subscriptionIds);
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
            return next(badRequests.NotEnParams({ reqParams: ['deviceIds', 'period'] }));
        }
        
        async.parallel({
            
            // get the current user with devices:
            user: function (cb) {
                UserModel
                    .findById(userId)
                    .populate({
                        path: 'devices',
                        match: {
                            status: {
                                $ne: DEVICE_STATUSES.DELETED
                            },
                            _id: {
                                $in: deviceIds
                            }
                        },
                        select: '_id billings status'
                    }).exec(function (err, userModel) {
                        var devices;

                        if (err) {
                            return cb(err);
                        }
                    
                        devices = userModel.devices;
                    
                        if (!devices || !devices.length) {
                            return cb(badRequests.NoActiveDevices());
                        } 

                        cb(null, userModel);
                    });

            },
            
            // get available tariff plans:
            plans: function (cb) {
                var criteria = {};
                
                TariffPlan.find(criteria, function (err, plans) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, plans)
                });
            } 
            
        }, function (err, results) {
            var userModel = results.user;
            var planModels = results.plans;
            var deviceModels = userModel.devices;
            var activeDeviceIds = _.pluck(deviceModels, '_id');
            var subscribedDevices = _.filter(deviceModels, function (deviceModel) {
                return deviceModel.status === DEVICE_STATUSES.SUBSCRIBED;
            });
            
            if (err) {
                return next(err);
            }
            
            async.waterfall([

                //unsubscribe on stripe:
                function (cb) {
                    var customerId = userModel.billings.stripeId;
                    var subscriptionIds = _.pluck(subscribedDevices, 'billings.subscriptionId');

                    unsubscribeOnStripe(customerId, subscriptionIds, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb();
                    });
                },

                //recalculate the users plan:
                function (cb) {
                    var calculationOptions = {
                        user: userModel,
                        plans: planModels,
                        period: period,
                        devices: deviceModels
                    };
                    
                    self.getUserTariffPlan(calculationOptions, function (err, calcResult) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, calcResult);
                    });
                },

                //subscription:
                function (calcResult, cb) {
                    var subscriptionOptions = {
                        userModel: userModel,
                        calcResult: calcResult,
                        token: token,
                        deviceIds: activeDeviceIds
                    };
                    
                    subscribe(subscriptionOptions, function (err, subscriptionResult) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, subscriptionResult, calcResult);
                    });
                },

                //update Devices.billings: (status, subscriptionId, expirationDate, ...)
                function (subscriptionResult, calcResult, cb) {
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
                    
                    if (!calcResult.amount) {
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
                                "billings.expirationDate": calcResult.expirationDate,
                                updatedAt: now
                            }
                        };
                    }
                    
                    DeviceModel.update(criteria, update, { multi: true }, function (err, quantity) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, calcResult);
                    });
                },

                //update User.billings data:
                function (calcResult, cb) {
                    var params = {
                        userId: userId,
                        calcResult: calcResult
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
                res.status(200).send({ success: 'subscribed' });
            });
        });
    };
    
    this.unsubscribeDevices = function (req, res, next) {
        var options = req.body;
        var userId = req.session.userId;
        var deviceIds = options.deviceIds;
       
        if (!deviceIds) {
            return next(badRequests.NotEnParams({ reqParams: 'deviceIds' }));
        }
        
        async.waterfall([
            
            //find the subscribed devices:
            function (cb) {
                var criteria = {
                    _id: userId
                };
               
                UserModel
                    .findOne(criteria)
                    .populate({
                        path: 'devices',
                        match: {
                            status: DEVICE_STATUSES.SUBSCRIBED,
                            _id: {
                                $in: deviceIds
                            }
                    },
                        select: 'billings.subscriptionId'
                    })
                    .exec(function (err, userModel) {
                        var customerId = userModel.billings.stripeId;
                        var devices;
                        var subscriptionIds;

                        if (err) {
                            return cb(err);
                        }
                    
                        devices = userModel.devices;
                        subscriptionIds = _.pluck(devices, 'billings.subscriptionId');
                    
                        cb(null, customerId, subscriptionIds);
                    });
            },

            //unsubscribe on stripe:
            function (customerId, subscriptionIds, cb) {
                var params = {
                    deviceIds: deviceIds
                };

                if (!customerId || !subscriptionIds || !subscriptionIds.length) { 
                    return cb();
                }

                findSubscriptionIdsToUnsubscribe(params, function (err, subscriptionIds) {
                    if (err) {
                        return cb(err);
                    }
                    
                    if (!subscriptionIds || !subscriptionIds.length) { 
                        return cb();
                    }
                    
                    unsubscribeOnStripe(customerId, subscriptionIds, function (err) {
                        if (err) { 
                            return cb(err);
                        }
                        cb();
                    });
                });
            },

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
                        //"billings.subscriptionId": null,
                        updatedAt: new Date()
                    }
                };
                
                DeviceModel.update(criteria, update, { multi: true }, function (err, count) {
                    if (err) {
                        return cb(err);
                    }
                    
                    cb(null, count);
                });
            },

            //update Users.billings.subscribedDevices:
            function (updatedDevicesCount, cb) {
                var updateParams = {
                    userId: userId,
                    quantity: (-1) * updatedDevicesCount
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
            
            res.status(200).send({ success: 'unsubscribed' });
        });

    };
    
    this.subscribeGeoFence = function (req, res, next) {
        var userId = req.session.userId;
        var deviceId = req.params.id;
        var options = req.body;
        var token = options.token;
        
        if (!token) {
            return next(badRequests.NotEnParams({ reqParams: 'token' }));
        }
        
        async.parallel({
            
            //find the current User:
            userModel: function (cb) {
                var criteria = {
                    _id: userId
                };
                
                UserModel.findOne(criteria, function (err, model) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, model);
                });
            },
            
            //find the device:
            deviceModel: function (cb) {
                var criteria = {
                    _id: deviceId
                };
                
                DeviceModel.findOne(criteria, function (err, model) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, model);
                });
            }

        }, function (err, results) {
            var deviceModel
            var now = new Date();
            
            if (err) {
                return next(err);
            }
            
            deviceModel = results.deviceModel;
            
            async.waterfall([

                //check is registered in stripe:
                function (cb) {
                    var currentUser = results.userModel;
                    
                    checkStripeId(currentUser, function (err, userModel) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, userModel);
                    });
                },

                //create subscription:
                function (userModel, cb) {
                    var customerId = userModel.billings.stripeId;
                    var planId = 'geoFence';
                    var expirationDate = new Date(new Date(now).setMonth(now.getMonth() + 1));
                    var quantity = 1;
                    var description = 'Minder charge for ' + userModel.email + '. Subscription for ' + planId + ', device ' + deviceId;
                    var subscriptionParams = {
                        plan: planId,
                        source: token.id,
                        quantity: quantity,
                        metadata: {
                            description: description,
                            quantity: quantity,
                            expirationDate: expirationDate,
                            deviceId: deviceId
                        }
                    };
                    
                    stripe.customers.createSubscription(customerId, subscriptionParams, function (err, charge) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, charge);
                    });
                },

                //update changes in deviceModel:
                function (charge, cb) {
                    var criteria = {
                        _id: deviceId
                    };
                    var update = {
                        $set: {
                            'geoFence.status': DEVICE_STATUSES.SUBSCRIBED,
                            'geoFence.subscriptionId': charge.id,
                            'geoFence.subscriptionDateTime': now,
                            'geoFence.expirationDate': charge.metadata.expirationDate,
                            updatedAt: new Date()
                        }
                    };
                    
                    DeviceModel.findOneAndUpdate(criteria, update, function (err, udpatedDevice) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, udpatedDevice);
                    });
                }
            ], function (err, device) {
                if (err) {
                    return next(err);
                }
                res.status(200).send({ success: 'success subscribed', device: device });
            });

        });
        

        //return next(badRequests.InvalidValue({ message: 'Not implemented' }));
    };
    
    this.unsubscribeGeoFence = function (req, res, next) {
        var userId = req.session.userId;
        var deviceId = req.params.id;

        unsubscribeGeoFencePack(userId, deviceId, function (err, deviceModel) {
            if (err) {
                return next(err);
            }
            res.status(200).send({ success: 'success unsubscribe', device: deviceModel });
        });
    };
    
    this.updateSync = function (req, res, next) {
        var options = req.body;
        var deviceId = req.params.id;
        var criteria;
        var update;
        var enabled = options.enabled;

        if (enabled === undefined) { 
        
        }

        if (!session.isAdmin(req)) {
            criteria.user = userId; //check permissions
        }
        
        update.$set.updatedAt = new Date();
        
        DeviceModel
            .findOneAndUpdate(criteria, update)
            .exec(function (err, device) {
            if (err) {
                next(err);
            } else if (!device) {
                next(badRequests.NotFound());
            } else {
                res.status(200).send({ success: 'updated', model: device });
            }
        });
    };

    this.cronJobForCheckExpirationDates = function (callback) {
        
        async.waterfall([

            //find devices with status "subscribed" and expired subscr.date and renewEnabled === false;
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
                var fields = {
                    user: 1,
                    name: 1,
                    "billings.expirationDate": 1
                };
                
                DeviceModel.find(criteria, fields, function (err, devices) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, devices);
                });

            },

            //update devices with status "subscribed" and expired subscr.date and renewEnabled === false;
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
                            status: DEVICE_STATUSES.ACTIVE,
                            "billings.expirationDate": null,
                            "billings.subscriptionId": null,
                            updatedAt: now
                        }
                    };
                    
                    DeviceModel.update(criteria, update, { multi: true }, function (err, count) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, devices);
                    });

                } else {
                    cb(null, devices);
                }
            },

            //send notification:
            function (devices, cb) {
                sendExpiredNotifications(devices);
                cb();
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
                
                UserModel.update(criteria, update, { multi: true }, function (err, result) {
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
    
    this.cronJobForNotifications = function (callback) {
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
                var timeLeft = moment(deviceJSON.billings.expirationDate).fromNow();
                
                deviceJSON['daysDiff'] = diff;
                deviceJSON['timeLeft'] = timeLeft;
                
                return deviceJSON;
            });
            
            users = _.groupBy(data, 'user');
            
            async.waterfall([

                //get the users email:
                function (cb) {
                    var userIds = Object.keys(users);
                    var criteria = {
                        _id: {
                            $in: userIds
                        }
                    };
                    var fields = {
                        email: 1,
                        firstName: 1,
                        lastName: 1
                    };
                    
                    UserModel.find(criteria, fields, function (err, userModels) {
                        var usersData;
                        
                        if (err) {
                            return cb(err);
                        }
                        
                        usersData = _.map(userModels, function (userModel) {
                            var userJSON = userModel.toJSON();
                            var devices = users[userModel._id];
                            
                            userJSON.devices = _.sortBy(devices, 'daysDiff');
                            
                            return userJSON;
                        });
                        
                        cb(null, usersData);
                    });
                },

                //send mail notification:
                function (users, cb) {
                    async.each(users, function (user, eachCb) {
                        mailer.beforeExpired(user);
                        eachCb();
                    }, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, users);
                    });
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
    
    this.setupJobForNotifications = function () {
        var rule = new schedule.RecurrenceRule();
        var job;
        
        rule.hour = 10;
        rule.minute = 5;
        rule.second = 0;
        
        job = schedule.scheduleJob(rule, function () {
            
            if (process.env.NODE_ENV !== 'production') {
                console.log('>>> node-schedule was started success ...');
                console.log('>>> rule: ', JSON.stringify(rule));
            }
            
            self.cronJobForNotifications(function (err, result) {
                if (err) {
                    
                    if (process.env.NODE_ENV !== 'production') {
                        console.error(err);
                        console.error(err.stack);
                    }

                } else {
                    
                    if (process.env.NODE_ENV !== 'production') {
                        console.log('>>> cron job was finished success. Result: ');
                        console.log(JSON.stringify(result));
                        console.log(util.inspect(result, { showHidden: true, depth: 6 }));
                    }

                }
            });
        });
    };
    
    this.setupJobForCheckExpirationDates = function () {
        var rule = new schedule.RecurrenceRule();
        var job;
        
        rule.hour = 0;
        rule.minute = 10;
        rule.second = 0;
        
        job = schedule.scheduleJob(rule, function () {
            
            if (process.env.NODE_ENV !== 'production') {
                console.log('>>> node-schedule was started success ...');
                console.log('>>> rule: ', JSON.stringify(rule));
            }
            
            self.cronJobForCheckExpirationDates(function (err, result) {
                if (err) {
                    
                    if (process.env.NODE_ENV !== 'production') {
                        console.error(err);
                        console.error(err.stack);
                    }

                } else {
                    
                    if (process.env.NODE_ENV !== 'production') {
                        console.log('>>> cron job was finished success. Result: ');
                        console.log(JSON.stringify(result));
                        console.log(util.inspect(result, { showHidden: true, depth: 6 }));
                    }

                }
            });
        });
    };
    
    this.testCronJobForCheckExpirationDates = function (req, res, next) {
        self.cronJobForCheckExpirationDates(function (err, result) {
            if (err) {
                return next(err);
            }
            res.status(200).send({ success: 'success job', result: result });
        });
    };
    
    this.testCronJobForNotifications = function (req, res, next) {
        self.cronJobForNotifications(function (err, result) {
            if (err) {
                return next(err);
            }
            res.status(200).send({ success: 'success job', result: result });
        });
    };

};

module.exports = DeviceHandler;