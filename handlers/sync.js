'use strict';

var CONSTANTS = require('../constants/index');
var mongoose = require('mongoose');
var async = require('async');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');

var SessionHandler = require('../handlers/sessions');
var badRequests = require('../helpers/badRequests');

var SyncHandler = function (db) {
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
    var imageUploader = fileSchema.uploader;

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

    function getTheFileModels(params, callback) {
        var deviceId = params.deviceId;
        var criteria = {
            device: deviceId
        };
        var page = parseInt(params.page) || 1;
        var count = parseInt(params.count) || 10;
        var skip = 0;
        var sort = params.sort || 'cratedAt';

        if (page > 1) {
            skip = (page - 1 ) * count;
        }

        FileModel.find(criteria)
            .sort(sort)
            .limit(count)
            .skip(skip)
            .exec(function (err, fileModels) {
                if (err) {
                    if (callback && (typeof callback === 'function')) {
                        callback(err);
                    }
                } else {
                    if (callback && (typeof callback === 'function')) {
                        callback(null, fileModels);
                    }
                }
            });
    };
    
    function getFilePath(fileName, bucket, rootDir) {
        var rootDir = rootDir || process.env.BUCKET;
        return path.join(rootDir, bucket, fileName);
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
                    callback(null, key);
                }
            }
        });
    };

    this.storeFile = function (req, res, next) {
        var userId = req.session.userId;
        var options = req.body;
        var deviceId = options.deviceId;
        var src = options.src;
        var originalName = options.originalName;

        async.waterfall([

            //validate params:
            function (cb) {

                if (!deviceId || !src || !originalName) {
                    return cb(badRequests.NotEnParams({reqParams: ['deviceId', 'originalName', 'src']}));
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
                self.saveFile(options, function (err, key) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, key);
                });
            },

            //save into db.Files:
            function (key, cb) {
                var saveData = {
                    device: deviceId,
                    originalName: originalName,
                    name: process.env.FILES_BUCKET,
                    key: key
                };

                var fileModel = new FileModel(saveData);

                fileModel.save(function (err, savedModel) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, savedModel);
                });
            }

        ], function (err, fileModel) {
            var url;
            var fileName;

            if (err) {
                return next(err);
            }

            //fileName = fileModel.;
            url = fileModel.generateImageUrl();

            res.status(201).send({success: 'successs created', model: fileModel, url: url});
        });
    };

    this.getFile = function (req, res, next) {
        var fileName = req.params.fileName;
        var bucket = process.env.FILES_BUCKET;
        var rootDir = process.env.BUCKET;        
        var filePath = imageUploader.getImageUrl(fileName, bucket);

        fs.exists(filePath, function (exists) {
            if (!exists) {
                return next(badRequests.NotFound());
            }

            res.sendfile(filePath, {}, function (err) {
                if (err) {
                    return next(err);
                }
            });
        });

    };

    this.getFilesByDevice = function (req, res, next) {
        var deviceId = req.params.id;
        var userId = req.session.userId;
        //todo: ... page, count, sort ...

        async.waterfall([

            //check access: ... todo ...
            function (cb) {
                cb();
            },

            //get the file models:
            function (cb) {
                var criteria = {
                    deviceId: deviceId
                };

                getTheFileModels(criteria, function (err, fileModels) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, fileModels);
                });
            }

        ], function (err, results) {
            if (err) {
                return next(err);
            }
            res.status(200).send(results);
        });

    };

    this.getFilesCountByDevice = function (req, res, next) {
        var deviceId = req.params.id;
        var criteria = {
            device: deviceId
        };

        FileModel.count(criteria).exec(function (err, filesCount) {
            if (err) {
                return next(err);
            }
            res.status(200).send({ count: filesCount });
        });
    };
};

module.exports = SyncHandler;