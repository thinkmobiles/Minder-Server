'use strict';
var DEVICE_OS = require('../constants/deviceOs');
var DEVICE_STATUSES = require('../constants/deviceStatuses');
var async = require('async');
var mongoose = require('mongoose');
var badRequests = require('../helpers/badRequests');
var logWriter = require('../helpers/logWriter')();
var SessionHandler = require('../handlers/sessions');

var DeviceHandler = function (db) {
    var session = new SessionHandler(db);
    var deviceSchema = mongoose.Schemas['Device'];
    var DeviceModel = db.model('Device', deviceSchema);
    var userSchema = mongoose.Schemas['User'];
    var UserModel = db.model('User', userSchema);
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

    this.getDevices = function (req, res, next) {
        var userId = req.session.userId;
        var params = req.query;
        var criteria = {};
        var skip = 0;
        var query;

        if (!session.isAdmin(req)) {
            criteria.user = userId;
        }

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

        //if (params.devices) {
        //    criteria._id = {
        //        $in: params.devices
        //    };
        //}

        //console.log(criteria);

        query = DeviceModel.find(criteria, 'name status _id');

        // if (!params.devices) {
        query.sort('name');
        query.limit(params.count);
        query.skip(skip);
        //}

        query.exec(function (err, devices) {
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

    this.getDevicesLocation = function (req, res, next) {
        var userId = req.session.userId;
        var options = req.body;
        var criteria = {
            status: DEVICE_STATUSES.SUBSCRIBED
        };
        var deviceIds;
        var fields = {
            name: 1,
            _id: 1,
            lastLocation: 1,
            updatedAt: 1
        };

        if (!options.devices) {
            return next(badRequests.NotEnParams({reqParams: ['devices']}));
        }

        deviceIds = JSON.parse(options.devices);
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

    function setStatusActive() {};

    function setStatusDeleted(deviceModel, callback) {
        var oldStatus = deviceModel.status;

        deviceModel.status = DEVICE_STATUSES.DELETED;

        device.save(function (err, updatedDevice) {
            var ownerId;

            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
                return
            }
            if (!updatedDevice) {
                if (callback && (typeof callback === 'function')) {
                    callback(badRequests.NotFound());
                }
                return;
            }

            if (oldStatus === DEVICE_STATUSES.SUBSCRIBED) {

                ownerId = deviceModel.user.toString();
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

        if ((deviceStatus !== DEVICE_STATUSES.ACTIVE) && (deviceStatus !== DEVICE_STATUSES.DELETED) ){
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
                var quantity;

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

    this.incrementSubscribedDevicesCount = function(userId, quantity, callback) {
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

};

module.exports = DeviceHandler;