'use strict';

var async = require('async');
var crypto = require("crypto");
var mongoose = require('mongoose');

var REG_EXP = require('../constants/regExp');
var USER_ROLES = require('../constants/userRoles');

var BadRequests = require('../helpers/badRequests');
var tokenGenerator = require('../helpers/randomPass');
var logWriter = require('../helpers/logWriter')();

var SessionHandler = require('../handlers/sessions');
var DeviceHander = require('../handlers/devices');
var mailer = require('../helpers/mailer');

var UserHandler = function (db) {
    var session = new SessionHandler(db);
    var badRequests = new BadRequests();
    var deviceHandler = new DeviceHander(db);

    var userSchema = mongoose.Schemas['User'];
    var UserModel = db.model('User', userSchema);
    var deviceSchema = mongoose.Schemas['Device'];
    var DeviceModel = db.model('Device', deviceSchema);

    function prepateUserData(data) {
        var userData = {};

        if (data && data.email) {
            userData.email = data.email;
        }

        if (data && data.firstName) {
            userData.firstName = data.firstName;
        }

        if (data && data.lastName) {
            userData.lastName = data.lastName
        }

        return userData;
    };

    function validateUserData(data, callback) {
        'use strict';

        if (!data || !data.email || !data.firstName || !data.lastName) {

            if (callback && (typeof callback === 'function')) {
                callback(badRequests.NotEnParams({reqParams: ['email', 'firstName', 'lastName']}));
            }
            return;
        }

        if (!REG_EXP.EMAIL_REGEXP.test(data.email)) {
            if (callback && (typeof callback === 'function')) {
                callback(badRequests.InvalidEmail());
            }
            return;
        }

        if (callback && (typeof callback === 'function')) {
            callback(); //valide data
        }

    };

    function validateSignUp(userData, deviceData, callback) {
        'use strict';

        async.parallel([

            //is valid user data:
            function (cb) {

                if (!userData || !userData.email || !userData.pass || !userData.firstName || !userData.lastName) {
                    return cb(badRequests.NotEnParams({reqParams: ['email', 'pass', 'firstName', 'lastName']}));
                }

                if (!REG_EXP.EMAIL_REGEXP.test(userData.email)) {
                    return cb(badRequests.InvalidEmail());
                }

                cb();
            },

            //is valid device data:
            function (cb) {
                if (deviceData) {
                    deviceHandler.validateDeviceData(deviceData, function (err) {
                        if (err) {
                            cb(err);
                        } else {
                            cb();
                        }
                    });
                } else {
                    cb();
                }
            },

            //is exists email;
            function (cb) {

                if (!userData || !userData.email) {
                    cb(badRequests.NotEnParams({reqParams: ['email', 'pass', 'firstName', 'lastName']}));

                } else {

                    UserModel.find({email: userData.email}, function (err, docs) {

                        if (err) {
                            cb(err)
                        } else if (docs && docs.length) {
                            cb(badRequests.EmailInUse());
                        } else {
                            cb();
                        }

                    });
                }
            },

            //is exists deviceId
            function (cb) {
                if (deviceData) {
                    DeviceModel.find({deviceId: deviceData.deviceId}, function(err, docs) {
                        if (err) {
                            cb(err);
                        } else if (docs && docs.length) {
                            cb(badRequests.DeviceIdInUse());
                        } else {
                            cb();
                        }
                    });
                } else {
                    cb();
                }
            }

        ], function (err) {
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

    function getEncryptedPass(pass) {
        var shaSum = crypto.createHash('sha256');
        shaSum.update(pass);
        return shaSum.digest('hex');
    };

    this.signUp = function (req, res, next) {
        'use strict';

        var options = req.body;
        var userData;
        var deviceData;

        userData = prepateUserData(options);
        userData.pass = options.pass;

        if (deviceHandler.isMobile(req)) {
            deviceData = deviceHandler.prepareDeviceData(options);
            deviceData.deviceType = deviceHandler.getDeviceOS(req);
        }

        validateSignUp(userData, deviceData, function (err) {
            var confirmToken;
            var encryptedPass;
            var newUser;
            var newDevice;
            var minderId;

            if (err) {
                return next(err);
            }

            confirmToken = tokenGenerator.generate();
            encryptedPass = getEncryptedPass(userData.pass);

            async.waterfall([

                //save user:
                function (cb) {
                    //userData.minderId = minderId;
                    userData.confirmToken = confirmToken;
                    userData.pass = encryptedPass;
                    userData.role = USER_ROLES.USER;

                    newUser = new UserModel(userData);

                    newUser.save(function (err, result) {
                        if (err) {
                            cb(err);
                        } else {
                            console.log('create user');
                            console.log(result);
                            cb(null, result);
                        }
                    });
                },

                //save device:
                function (userModel, cb) {

                    console.log('save device');
                    console.log(userModel);

                    if (deviceData) {
                        minderId = tokenGenerator.generate(12);
                        deviceData.minderId = minderId;

                        newDevice = new DeviceModel(deviceData);
                        newDevice.user = userModel._id;
                        newDevice.save(function (err, result) {
                            if (err) {
                                //TODO: rollback - remove the user;
                                cb(err);
                            } else {
                                cb();
                            }
                        });

                    } else {
                        cb(); //registration from web, deviceData is undefined;
                    }
                }

            ], function (err) {
                var resData;

                if (err) {
                    return next(err);
                }


                resData = {
                    success: 'success signUp',
                    message: 'Thank you for registering with Minder. Please check your email and verify account',
                    minderId: minderId
                };

                if (minderId) {
                    userData.minderId = minderId
                }

                mailer.emailConfirmation(userData);

                res.status(201).send(resData);
            });
        });
    };

    function signInWeb(req, res, next) {
        var options = req.body;
        var encryptedPass;

        if (!options.email || !options.pass) {
            return next(badRequests.NotEnParams({reqParams: ['email', 'pass']}));
        }

        encryptedPass = getEncryptedPass(options.pass);

        UserModel.findOne({
            email: options.email,
            pass: encryptedPass
        }, function (err, user) {
            console.log('findOne');
            console.log(user);
            if (err) {
                next(err);
            } else if (user && user.confirmToken) {
                next(badRequests.UnconfirmedEmail());
            } else {
                res.status(200).send(user);
            }
        });

    };

    function signInMobile(req, res, next) {
        res.status(500).send('Not implemented');
    };

    this.signIn = function (req, res, next) {

        if (deviceHandler.isMobile(req)) {
            signInMobile(req, res, next);
        } else {
            signInWeb(req, res, next);
        }
    };
};

module.exports = UserHandler;