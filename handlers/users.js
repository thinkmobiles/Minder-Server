'use strict';

var async = require('async');
var crypto = require("crypto");
var mongoose = require('mongoose');

var REG_EXP = require('../constants/regExp');
var USER_ROLES = require('../constants/userRoles');

var badRequests = require('../helpers/badRequests');
var tokenGenerator = require('../helpers/randomPass');
var logWriter = require('../helpers/logWriter')();

var SessionHandler = require('../handlers/sessions');
var DeviceHander = require('../handlers/devices');
var mailer = require('../helpers/mailer');

var UserHandler = function (db) {
    var session = new SessionHandler(db);
    var deviceHandler = new DeviceHander(db);

    var userSchema = mongoose.Schemas['User'];
    var UserModel = db.model('User', userSchema);
    var deviceSchema = mongoose.Schemas['Device'];
    var DeviceModel = db.model('Device', deviceSchema);
    var self = this;

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

    function validateSignUp(userData, deviceData, callback) { //used for signUpMobile, signUpWeb;
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
                    DeviceModel.find({deviceId: deviceData.deviceId}, function (err, docs) {
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

    function createUser(userData, callback) {
        'use strict';

        var encryptedPass;
        var minderId;
        var confirmToken;
        var newUser;

        encryptedPass = getEncryptedPass(userData.pass);
        minderId = tokenGenerator.generate(12);
        confirmToken = tokenGenerator.generate();

        userData.minderId = minderId;
        userData.confirmToken = confirmToken;
        userData.pass = encryptedPass;
        userData.role = USER_ROLES.USER;

        newUser = new UserModel(userData);

        newUser.save(function (err, result) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
            } else {
                console.log('create user');
                console.log(result);
                if (callback && (typeof callback === 'function')) {
                    callback(null, result);
                }
            }
        });

    };

    function signUpMobile(req, res, next) {
        'use strict';

        var options = req.body;
        var userData;
        var deviceData;

        userData = prepateUserData(options);
        userData.pass = options.pass;

        deviceData = deviceHandler.prepareDeviceData(options);
        deviceData.deviceType = deviceHandler.getDeviceOS(req);

        validateSignUp(userData, deviceData, function (err) {
            if (err) {
                return next(err);
            }

            async.waterfall([

                //save user:
                function (cb) {
                    createUser(userData, function (err, userModel) {
                        if (err) {
                            cb(err);
                        } else {
                            cb(null, userModel);
                        }

                    });
                },

                //save device:
                function (userModel, cb) {
                    deviceHandler.createDevice(deviceData, userModel, function (err, deviceModel) {
                        if (err) {
                            cb(err);
                            //FIXME: remove user (rollback);
                        } else {
                            cb(null, userModel, deviceModel);
                        }
                    });
                }

            ], function (err, user, device) {
                var resData;
                var minderId;

                if (err) {
                    return next(err);
                }

                minderId = user.minderId;
                resData = {
                    success: 'success signUp',
                    message: 'Thank you for registering with Minder. Please check your email and verify account',
                    minderId: minderId
                };

                userData.minderId = minderId;

                mailer.emailConfirmation(userData);

                res.status(201).send(resData);
            });
        });

    };

    function signUpWeb(req, res, next) {
        'use strict';

        var options = req.body;
        var userData;

        userData = prepateUserData(options);
        userData.pass = options.pass;

        validateSignUp(userData, null, function (err) {
            if (err) {
                return next(err);
            }

            createUser(userData, function (err, user) {
                var resData;
                var minderId;

                if (err) {
                    return next(err);
                }

                minderId = user.minderId;
                resData = {
                    success: 'success signUp',
                    message: 'Thank you for registering with Minder. Please check your email and verify account',
                    minderId: minderId
                };

                userData.minderId = minderId;

                mailer.emailConfirmation(userData);

                res.status(201).send(resData);
            });
        });

    };

    this.signUp = function (req, res, next) {
        'use strict';

        if (deviceHandler.isMobile(req)) {
            signUpMobile(req, res, next);
        } else {
            signUpWeb(req, res, next);
        }

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

            if (err) {
                next(err);
            } else if (user && user.confirmToken) {
                next(badRequests.UnconfirmedEmail());
            } else {
                //res.status(200).send(user);
                session.register(req, res, user);
            }

        });

    };

    function signInMobile(req, res, next) {
        var options = req.body;

        if (!options.minderId || !options.deviceId) {
            return next(badRequests.NotEnParams({reqParams: ['minderId', 'deviceId']}));
        }

        UserModel.findOne({
            minderId: options.minderId
        }, function (err, user) {

            if (err) {
                return next(err);
            }

            if (!user) {
                return next(badRequests.SignInError({message: 'Incorrect minderId'}));
            }

            if (user && user.confirmToken) {
                return next(badRequests.UnconfirmedEmail());
            }

            DeviceModel
                .findOne({
                    deviceId: options.deviceId
                }, function (err, device) {
                    var deviceData;

                    if (err) {
                        return next(err);
                    } else if (device) {

                        if (device.user.toString() === user._id.toString()) {
                            session.register(req, res, user);
                        } else {
                            next(badRequests.AccessError());
                        }

                    } else {
                        //create device;
                        deviceData = deviceHandler.prepareDeviceData(options);
                        deviceData.deviceType = deviceHandler.getDeviceOS(req);

                        deviceHandler.createDevice(deviceData, user, function (err) {

                            if (err) {
                                return next(err);
                            }

                            session.register(req, res, user);
                        });
                    }
                });

        });
    };

    this.signIn = function (req, res, next) {

        if (deviceHandler.isMobile(req)) {
            signInMobile(req, res, next);
        } else {
            signInWeb(req, res, next);
        }
    };

    this.confirmEmail = function (req, res, next) {
        var confirmToken = req.params.confirmToken;
        var condition = {
            confirmToken: confirmToken
        };
        var update = {
            confirmToken: null
        };

        UserModel.findOneAndUpdate(condition, update, function (err, userModel) {
            if (err) {
                return self.renderError(err, req, res);
            }

            if (!userModel) {
                return self.renderError(badRequests.NotFound(), req, res);
            }

            res.render('successConfirm');

            //res.redirect(process.env.HOST + '/successConfirm');

            //return res.status(500).send('NotImplementedYet');
            /*//FIXME: update the userModel:
            userModel
                .save({confirmToken: null}, function (err, user) {
                    if (err) {
                        return self.renderError(err, req, res);
                    }

                    res.redirect(process.env.HOST + '/successConfirm');

                });*/

        });

    };

    this.renderError = function (err, req, res) {
        res.render('errorTemplate', {error: err});
    };

};

module.exports = UserHandler;