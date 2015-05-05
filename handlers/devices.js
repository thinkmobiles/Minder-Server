'use strict';
var DEVICE_OS = require('../constants/deviceOs');
var DEVICE_STATUSES = require('../constants/deviceStatuses');
var RESPONSES = require('../constants/responses');
var async = require('async');
var mongoose = require('mongoose');
var badRequests = require('../helpers/badRequests');
var logWriter = require('../helpers/logWriter')();

var SessionHandler = require('../handlers/sessions');

var DeviceHandler = function (db) {
    var session = new SessionHandler(db);
    var deviceSchema = mongoose.Schemas['Device'];
    var DeviceModel = db.model('Device', deviceSchema);
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
        var params = req.body;
        var criteria = {};

        console.log('params', params);

        if (!params.devices) {
            return res.status(200).send([]);
        } else {
            criteria._id = {
                $in: JSON.parse(params.devices)
            }
        }

        if (!session.isAdmin(req)) {
            criteria.user = userId;
            criteria.status = 'subscribed';
        }
        console.log('criteria', criteria);
        console.log('req.session', req.session);

        DeviceModel.find(criteria, 'name _id lastLocation updatedAt')
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
        var id = req.params.id;
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
        });

        //res.status(500).send('Not implemented');
    };

    this.setDeleted = function (req, res, next) {
        var userId = req.session.userId;
        var deviceId = req.params.id;
        var criteria;
        var update = {
            status: DEVICE_STATUSES.DELETED
        };

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

        /*if(status!==STATUSES.DELETED && status!==STATUSES.ACTIVE){
         //if(status!==STATUSES.DELETED && status!==STATUSES.ACTIVE && status!==STATUSES.SUBSCRIBED){
         return next(badRequests.NotEnParams());
         }*/

        DeviceModel.findOneAndUpdate(criteria, update, function (err, device) {
            if (err) {
                return next(err);
            }
            if (!device) {
                return next(badRequests.NotFound());
            }

            res.status(200).send(device);

            /*device.save(function (err, newDevice) {
                if (err) {
                    return next(err);
                }
                console.log(newDevice);
                res
                    .status('200') //TODO: '200'
                    .send(newDevice);
            });*/

        });
    }

};

module.exports = DeviceHandler;