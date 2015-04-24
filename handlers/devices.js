'use strict';
var DEVICE_OS = require('../constants/deviceOs');
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

        var params = req.query;

        console.log('>>>>>>>', params);

        console.log(params);
        var criteria = {
            user: req.session.userId
        };
        var skip = 0;
        var query;

        params.page = parseInt(params.page) || 1;
        params.count = parseInt(params.count) || 10;

        if (params.page > 1) {
            skip = (params.page - 1 ) * params.count;
        }

        if (params.name) {
            criteria.name = new RegExp(params.name.trim(), "i");
        }

        //if (params.name) {
        //    criteria.name = {
        //        $in: [new RegExp(params.name.trim(), "i")]
        //    };
        //}


        if (params.isPayed === 'true') {
            criteria.isPayed = true;
        }
        if (params.isPayed === 'false') {
            criteria.isPayed = false;
        }
        if (params.enabledTrackLocation === 'true') {
            criteria.enabledTrackLocation = true;
        }
        if (params.enabledTrackLocation === 'false') {
            criteria.enabledTrackLocation = false;
        }
        if (params.devices) {
            criteria._id = {
                $in: params.devices
            };
        }

        //console.log(criteria);

        query = DeviceModel.find(criteria);
        if (!params.devices) {
            query.sort('name');
            query.limit(params.count);
            query.skip(skip);
        }
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

        if (params.isPayed === 'true') criteria.isPayed = true;
        if (params.isPayed === 'false') criteria.isPayed = false;
        if (params.enabledTrackLocation === 'true') criteria.enabledTrackLocation = true;
        if (params.enabledTrackLocation === 'false') criteria.enabledTrackLocation = false;

        console.log(params, skip);

        DeviceModel.count(criteria)
            .exec(function (err, devices) {
                if (err) {
                    return next(err);
                }
                res.status(200).send({count: devices});
            });
    };

    this.getDevice = function (req, res, next) {
        var userId = req.session.userId;
        var devId = req.params.id;
        var criteria = {
            _id: devId
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
        var devId = req.params.id;
        var criteria = {
            _id: devId
        };
        var update = {};

        if (options.name) {
            update.name = options.name;
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

};

module.exports = DeviceHandler;