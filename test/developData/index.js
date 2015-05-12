'use strict';

var async = require('async');
var crypto = require("crypto");
var mongoose = require('mongoose');

var CreateTestData = function (db) {
    var userSchema = mongoose.Schemas['User'];
    var UserModel = db.model('User', userSchema);
    var deviceSchema = mongoose.Schemas['Device'];
    var DeviceModel = db.model('Device', deviceSchema);
    //var tariffPlanSchema = mongoose.Schemas['TariffPlan'];
    //var TariffPlan = db.model('TariffPlan', tariffPlanSchema);

    var data = require('./testData');

    function getEncryptedPass(pass) {
        var shaSum = crypto.createHash('sha256');
        shaSum.update(pass);
        return shaSum.digest('hex');
    };

    this.createUsers = function (callback) {
        var users = data.users || [];
        var userId = 1;

        UserModel.remove({}, function (err) {
            if (err) {
                callback(err);
            } else {
                async.eachSeries(users,
                    function (user, cb) {
                        var newUser;
                        var encrPass = getEncryptedPass(user.pass);

                        user.pass = encrPass;
                        //user._id = userId;
                        //userId++;
                        newUser = new UserModel(user);
                        newUser.save(function (err) {
                            if (err) {
                                cb(err);
                            } else {
                                cb();
                            }
                        });
                    },
                    function (err) {
                        if (err) {
                            callback(err)
                        } else {
                            callback();
                        }
                    });
            }
        });
    };

    this.createDevices = function (callback) {
        var devies = data.devices || [];

        //console.log(devies);

        DeviceModel.remove({}, function (err) {
            if (err) {
                callback(err);
            } else {
                async.eachSeries(devies,
                    function (device, cb) {
                        var newDevice = new DeviceModel(device);

                        newDevice.save(function (err) {
                            if (err) {
                                cb(err);
                            } else {
                                cb();
                            }
                        });
                    },
                    function (err) {
                        if (err) {
                            callback(err)
                        } else {
                            callback();
                        }
                    });
            }
        });
    };

    //this.createDevices = function (callback) {
    //    var tariffPlans = data.tariffPlans || [];
    //
    //    //console.log(tariffPlans);
    //
    //    TariffPlan.remove({}, function (err) {
    //        if (err) {
    //            callback(err);
    //        } else {
    //            async.eachSeries(tariffPlans,
    //                function (device, cb) {
    //                    var newPlan = new TariffPlan(device);
    //
    //                    newPlan.save(function (err) {
    //                        if (err) {
    //                            cb(err);
    //                        } else {
    //                            cb();
    //                        }
    //                    });
    //                },
    //                function (err) {
    //                    if (err) {
    //                        callback(err)
    //                    } else {
    //                        callback();
    //                    }
    //                });
    //        }
    //    });
    //};

};


var mongoose = require('mongoose');
var mainDb;
var dbsObject = {};
var dbsNames = {};

if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
}

require('../../config/' + process.env.NODE_ENV);

mongoose.connect(process.env.DB_HOST, process.env.DB_NAME);
mainDb = mongoose.connection;
mainDb.on('error', console.error.bind(console, 'connection error:'));
mainDb.once('open', function callback() {
    mainDb.dbsObject = dbsObject;
    console.log('Connection to ' + process.env.DB_HOST + '/' + process.env.DB_NAME + ' is success');

    require('../../models/index.js');

    var sessionSchema = mongoose.Schema({
        _id: String,
        session: String,
        expires: Date
    }, {collection: 'sessions'});

    var main = mainDb.model('sessions', sessionSchema);
    var port = process.env.PORT || 8877;

    main.find().exec(function (err, result) {
        if (err) {
            console.error('Something went wrong in main server');
            return process.exit(1);
        }
    });


    mainDb.mongoose = mongoose;

    var createTestData = new CreateTestData(mainDb);

    async.parallel([
        createTestData.createUsers,
        createTestData.createDevices
    ], function (err) {
        if (err) {
            return console.error(err);
        } else {
            console.log('done');
        }
    });
});


//
//var Config = require('./../config');
//var testData = require('./../data/testData');
//
//
//var conf = new Config();
//var db = conf.db;
//var createTestData = new CreateTestData(db);
//
//async.parallel([
//    createTestData.createUsers,
//    createTestData.createDevices
//], function (err) {
//    if (err) {
//        done(err);
//    } else {
//        console.log('done');
//    }
//});
//
