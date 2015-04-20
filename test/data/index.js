'use strict';

var async = require('async');
var crypto = require("crypto");
var mongoose = require('mongoose');
var USER_ROLES = require('../../constants/userRoles');

module.exports = function (db) {
    var userSchema = mongoose.Schemas['User'];
    var UserModel = db.model('User', userSchema);
    var deviceSchema = mongoose.Schemas['Device'];
    var DeviceModel = db.model('Device', deviceSchema);

    var data = require('./testData');

    function getEncryptedPass(pass) {
        var shaSum = crypto.createHash('sha256');
        shaSum.update(pass);
        return shaSum.digest('hex');
    };

    console.log('users');
    console.log(data);

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

};