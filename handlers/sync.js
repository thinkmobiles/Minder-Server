'use strict';

var CONSTANTS = require('../constants/index');
var mongoose = require('mongoose');
var async = require('async');
var _ = require('lodash');

var uploaderConfig;
var amazonS3conf;

if (process.env.UPLOADER_TYPE === 'AmazonS3') {
    amazonS3conf = require('../config/aws');
    uploaderConfig = {
        type: process.env.UPLOADER_TYPE,
        awsConfig: amazonS3conf
    };
} else {
    uploaderConfig = {
        type: process.env.UPLOADER_TYPE,
        directory: process.env.BUCKET
    };
}

var SessionHandler = require('../handlers/sessions');
var badRequests = require('../helpers/badRequests');

var SyncHandler = function (db) {
    var imageUploader = require('../helpers/imageUploader/imageUploader')(uploaderConfig);
    var session = new SessionHandler(db);
    var self = this;

    var tariffPlanSchema = mongoose.Schemas['TariffPlan'];
    var TariffPlan = db.model('TariffPlan', tariffPlanSchema);

    var userSchema = mongoose.Schemas['User'];
    var UserModel = db.model('User', userSchema);

    var deviceSchema = mongoose.Schemas['Device'];
    var DeviceModel = db.model('Device', deviceSchema);

    var fileSchema = mongoose.Schemas['File'];
    var FileModel = db.model('File', fileSchema);

    function random(number) {
        return Math.floor((Math.random() * number));
    }

    function computeKey(name, ticks) {
        var name_ = name || CONSTANTS.DEFAULT_FILE_NAME;
        var ticks_ = ticks || new Date().valueOf();
        var key;

        key = name_ + '_' + ticks_ + '_' + random(1000);

        return key;
    };

    function generateFileUrl(fileName) {
        return '/sync/files/' + fileName;
    };

    function getFilePath(fileName) {
        return '';
    };

    this.saveFile = function (options, callback) {
        var fileNams;
        var src;
        var name;
        var key;
        var bucket = process.env.FILES_BUCKET;
        //TODO: validate ...

        src = options.src;
        name = options.name;
        key = computeKey();

        if (process.env.NODE_ENV !== 'production') {
            console.log('--- Upload file ----------------');
            console.log('name', name);
            console.log('key', key);
            console.log('bucket', bucket);
            console.log('--------------------------------');
        }

        imageUploader.uploadImage(src, key, bucket, function (err, fileName) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
            } else {
                if (callback && (typeof callback === 'function')) {
                    callback(null, fileName);
                }
            }
        });
    };

    this.storeFile = function (req, res, next) {
        var userId = req.session.userId;
        var options = req.body;
        var deviceId = options.deviceId;

        async.waterfall([

            //validate params:
            function (cb) {

                if (!deviceId || !options.src || !options.name) {
                    return cb(badRequests.NotEnParams({reqParams: ['deviceId', 'name', 'src']}));
                }

                cb();
            },

            //find the device model:
            function (cb) {
                var criteria = {
                    _id: deviceId
                };

                DeviceModel.findOne(criteria, function (err, device) {
                    var ownerId;

                    if (err) {
                        cb(err);
                    } else if (!device) {
                        cb(badRequests.NotFound());
                    } else {

                        if (!device.user) {
                            return cb(badRequests.InvalidValue({param: 'device.user', value: device.user}));
                        }

                        ownerId = device.user.toString();

                        if (!session.isAdmin(req) && (ownerId !== userId)) {
                            return cb(badRequests.AccessError());
                        }

                        cb();
                    }
                });
            },

            //save the file:
            function (cb) {
                self.saveFile(options, function (err, fileName) {
                    //var url;

                    if (err) {
                        return cb(err);
                    }

                    //url = generateFileUrl(fileName);
                    cb(null, fileName);
                });
            },

            //save into db.Files:
            function (fileName, cb) {
                console.log('>>> fileName', fileName);
                cb(null, fileName); //TODO: ...
            }

        ], function (err, result) {
            var url;
            var fileName;

            if (err) {
                return next(err);
            }

            fileName = result;
            url = generateFileUrl(fileName);

            res.status(201).send({success: 'success', result: result, url: url});
        });
    };

    this.getFile = function (req, res, next) {
        next(badRequests.InvalidValue({message: 'Not implemented'}));
    };
};

module.exports = SyncHandler;