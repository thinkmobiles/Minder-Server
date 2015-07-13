'use strict';

var CONSTANTS = require('../constants/index');
var DEVICE_STATUSES = require('../constants/deviceStatuses');

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
        var orderBy;
        var order;
        var sort;

        if (params && params.sort) {
            orderBy = params.sort
            order = params.order || 1;
        } else {
            orderBy = 'createdAt';
            order = -1;
        }
        
        sort = {};
        sort[orderBy] = order;

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
    
    this.saveFileStream = function (options, callback) {
        //TODO: validate ...

        async.waterfall([

                //get file from request:
                function (cb) {
                    var file = options.file;
                
                    fs.readFile(file.path, function (err, data) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, data);
                    });
                },

                //save file to storage:
                function (fileData, cb) {
                    var fileNams;
                    //var name;
                    var key;
                    var bucket = process.env.FILES_BUCKET;
                    var src = fileData.toString('base64');
                    //name = options.name;
                    key = computeKey();
                
                    if (process.env.NODE_ENV !== 'production') {
                        console.log('--- Upload file ----------------');
                        //console.log('name', name);
                        console.log('key', key);
                        console.log('bucket', bucket);
                        console.log('--------------------------------');
                    }
                
                                   
                    imageUploader.uploadImage(src, key, bucket, function (err, fileName) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, key);
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

    this.storeFile = function (req, res, next) {
        var userId = req.session.userId;
        var options = req.body;
        var deviceId = req.session.deviceId || "556591073048b12c78000002"; //TODO remove
        var src = options.src;
        var originalName = options.originalName;
        var fileCreatedAt = options.fileCreatedAt;
        var size = options.size;
        var file = req.files.file;
        
        console.log('----------------------');
        console.log(JSON.stringify(options));
        console.log(file);
        console.log('----------------------');

        async.waterfall([

            //validate params:
            function (cb) {
                
                if (!deviceId) { 
                    return cb(badRequests.AccessError({message: 'Please login from yur device', status: 403}));
                }

                if (!originalName || !fileCreatedAt || !file) {
                    return cb(badRequests.NotEnParams({reqParams: ['originalName', 'originalName', 'fileCreatedAt']}));
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

                        //if (!session.isAdmin(req) && (ownerId !== userId)) {
                        //    return cb(badRequests.AccessError());
                        //}
                        
                        //if (!device.sync.enabled) { 
                        //    return cb(badRequests.AccessError({message: 'This functionality is disabled.'}));
                        //}
                        
                        
                        //TODO: check payment:
                        //if (device.sync.status !== DEVICE_STATUSES.SUBSCRIBED) {
                        //    return cb(badRequests.PaymentRequired());
                        //}
                        
                        cb();
                    }
                });
            },

            //save the file:
            function (cb) {
                var file = req.files.file;
                
                options.file = file;
                self.saveFileStream(options, function (err, key) {
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
                    key: key,
                    size: size,
                    fileCreatedAt: fileCreatedAt
                };

                var fileModel = new FileModel(saveData);

                fileModel.save(function (err, savedModel) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, savedModel);
                });
            },

            //update the device sync data...
            function (fileModel, cb) {
                var update = {
                    $set: {
                        "sync.lastSyncDateTime": new Date()
                    }
                };

                DeviceModel.findByIdAndUpdate(deviceId, update, function (err, device) {
                    if (err) { 
                        return cb(err);
                    }
                    return cb(null, fileModel);
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
        var params = req.query;
        var page = parseInt(params.page) || 1;
        var count = parseInt(params.count) || 10;
        var skip = 0;
        var sort = params.sort || 'createdAt';
        var order = params.order || 'DESC';

        async.waterfall([

            //check access: ... todo ...
            function (cb) {
                cb();
            },

            //get the file models:
            function (cb) {                
                params.deviceId = deviceId;
                getTheFileModels(params, function (err, fileModels) {
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