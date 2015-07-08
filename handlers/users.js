'use strict';

var CONSTANTS = require('../constants/index');
var REG_EXP = require('../constants/regExp');
var DEFAULT_FIELDS = {
    _id: 1,
    minderId: 1,
    firstName: 1,
    lastName: 1,
    email: 1,
    billings: 1,
    role: 1,
    confirmToken: 1,
    devices: 1
} ;

var async = require('async');
var crypto = require("crypto");
var mongoose = require('mongoose');
var http = require('http');
var querystring = require('querystring');

var badRequests = require('../helpers/badRequests');
var tokenGenerator = require('../helpers/randomPass');
var logWriter = require('../helpers/logWriter')();

var mailer = require('../helpers/mailer');

var SessionHandler = require('./sessions');
var DeviceHander = require('./devices');

var UserHandler = function (db) {
    var session = new SessionHandler(db);
    var deviceHandler = new DeviceHander(db);

    var userSchema = mongoose.Schemas['User'];
    var UserModel = db.model('User', userSchema);
    var deviceSchema = mongoose.Schemas['Device'];
    var DeviceModel = db.model('Device', deviceSchema);
    var tariffPlanSchema = mongoose.Schemas['TariffPlan'];
    var TariffPlan = db.model('TariffPlan', tariffPlanSchema);
    var self = this;

    function normalizeEmail(email) {
        return email.trim().toLowerCase();
    };

    function validateSignUp(userData, callback) { //used for signUpMobile, signUpWeb;
        var errMessage;

        if (!userData || !userData.email || !userData.pass || !userData.firstName || !userData.lastName) {
            return callback(badRequests.NotEnParams({reqParams: ['email', 'pass', 'firstName', 'lastName']}));
        }

        if (userData.pass.length < CONSTANTS.PASS_MIN_LENGTH) {
            errMessage = 'Password cannot contain less than ' + CONSTANTS.PASS_MIN_LENGTH + ' symbols';
            return callback(badRequests.InvalidValue({message: errMessage}));
        }

        if (userData.pass.length > CONSTANTS.PASS_MAX_LENGTH) {
            errMessage = 'Password cannot contain more than ' + CONSTANTS.PASS_MAX_LENGTH + ' symbols';
            return callback(badRequests.InvalidValue({message: errMessage}));
        }

        if (userData.firstName.length > CONSTANTS.USERNAME_MAX_LENGTH) {
            errMessage = 'First name cannot contain more than ' + CONSTANTS.USERNAME_MAX_LENGTH + ' symbols';
            return callback(badRequests.InvalidValue({message: errMessage}));
        }

        if (userData.lastName.length > CONSTANTS.USERNAME_MAX_LENGTH) {
            errMessage = 'Last name cannot contain more than ' + CONSTANTS.PASS_MIN_LENGTH + ' symbols';
            return callback(badRequests.InvalidValue({message: errMessage}));
        }

        if (!REG_EXP.EMAIL_REGEXP.test(userData.email)) {
            return callback(badRequests.InvalidEmail());
        }

        userData.email = normalizeEmail(userData.email);

        UserModel.findOne({email: userData.email}, function (err, user) {
            if (err) {
                callback(err);
            } else if (user) {
                callback(badRequests.EmailInUse());
            } else {
                callback();
            }
        });

    };

    function getEncryptedPass(pass) {
        var shaSum = crypto.createHash('sha256');
        shaSum.update(pass);
        return shaSum.digest('hex');
    };

    function checkCaptcha(params, callback) {
        if (!params.captchaChallenge || !params.captchaResponse || !params.ip) {
            return callback(badRequests.CaptchaError());
        }

        var captchaVerifyData = querystring.stringify({
            privatekey: process.env.RECAPTCHA_PRIVATE_KEY,
            remoteip: params.ip,
            challenge: params.captchaChallenge,
            response: params.captchaResponse
        });

        var options = {
            hostname: 'www.google.com',
            path: '/recaptcha/api/verify',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            port: 80
        };

        var httpRequest = http.request(options, function (response) {
            response.setEncoding('utf8');

            if (response.statusCode !== 200) {
                return callback(badRequests.CaptchaError());
            }

            response.on('data', function (chunk) {
                if (chunk.indexOf('true') === -1) {
                    return callback(badRequests.CaptchaError());
                }
                callback(null, true);
            });
        });

        httpRequest.on('error', function (err) {
            callback(err);
        });
        httpRequest.write(captchaVerifyData);
        httpRequest.end();

    };

    function createUser(userData, callback) {

        async.waterfall([

            //get base plan:
            function (cb) {
                var criteria = {
                    name: CONSTANTS.DEFAULT_TARIFF_NAME
                };
                var fields = '_id';

                TariffPlan.findOne(criteria, fields, function (err, plan) {
                    if (err) {
                        cb(err);
                    } else if (!plan) {
                        cb(badRequests.NotFound({message: 'TariffPlanModel was not found'}));
                    } else {
                        cb(null, plan);
                    }
                });
            },

            //create user:
            function (basePlanModel, cb) {
                var encryptedPass;
                var minderId;
                var confirmToken;
                var newUser;

                encryptedPass = getEncryptedPass(userData.pass);
                minderId = tokenGenerator.generate(CONSTANTS.MINDER_ID_LENGTH);
                confirmToken = tokenGenerator.generate();

                userData.minderId = minderId;
                userData.confirmToken = confirmToken;
                userData.pass = encryptedPass;

                newUser = new UserModel(userData);
                newUser.billings.currentPlan = basePlanModel._id;

                newUser.save(function (err, result) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, result);
                });
            }

        ], function (err, userModel) {
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

    function updateUserProfile(userId, options, callback) {
        var update = options;
        var criteria = {
            _id: userId
        };

        UserModel.findOneAndUpdate(criteria, update, function (err, user) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
            } else if (!user) {
                if (callback && (typeof callback === 'function')) {
                    callback(badRequests.NotFound());
                }
            } else {
                if (callback && (typeof callback === 'function')) {
                    callback(null, user);
                }
            }
        });
    };

    function signInWeb(req, res, next) {
        var options = req.body;
        var email = options.email;
        var encryptedPass;
        var criteria;
        var fields;

        if (!email || !options.pass) {
            return next(badRequests.NotEnParams({reqParams: ['email', 'pass']}));
        }

        email = normalizeEmail(email);
        encryptedPass = getEncryptedPass(options.pass);
        criteria = {
            email: email,
            pass: encryptedPass
        };
        fields: {
            pass: 0
        };

        UserModel.findOne(criteria, DEFAULT_FIELDS, function (err, user) {
            console.log(user);
            var sessionParams;

            if (err) {
                return next(err);
            }

            if (!user) {
                return next(badRequests.SignInError());
            }

            if (user && user.confirmToken) {
                return next(badRequests.UnconfirmedEmail());
            }

            sessionParams = {
                rememberMe: options.rememberMe
            };

            session.register(req, res, user, sessionParams);

        });

    };

    function signInMobile(req, res, next) {
        var options = req.body;
        
        if (!options.minderId || !options.deviceId) {
            return next(badRequests.NotEnParams({reqParams: ['minderId', 'deviceId']}));
        }
        
        async.waterfall([
            
            //try to find the user:
            function (cb) {
                var userCriteria = {
                    minderId: options.minderId
                };
                var deviceCriteria = {
                    deviceId: options.deviceId
                };

                UserModel.findOne(userCriteria, DEFAULT_FIELDS)
                    .populate({
                        path: 'devices',
                        match: deviceCriteria,
                        select: '_id deviceId'
                    }).exec(function (err, user) {

                        if (err) {
                            return cb(err);
                        }
                    
                        if (!user) {
                            return cb(badRequests.SignInError({ message: 'Incorrect Minder ID' }));
                        }
                    
                        if (user && user.confirmToken) {
                            return cb(badRequests.UnconfirmedEmail());
                        }
                    
                        if (user && user.devices && user.devices.length) {
                            cb(null, user, user.devices[0]);
                        } else { 
                            cb(null, user, null);
                        }

                    });
            },

            //create the device if need:
            function (userModel, deviceModel, cb) {
                var deviceData;

                if (userModel && deviceModel) { 
                    return cb(null, userModel, deviceModel);
                }
                
                deviceData = deviceHandler.prepareDeviceData(options);
                deviceData.deviceType = deviceHandler.getDeviceOS(req);
                
                deviceHandler.createDevice(deviceData, userModel, function (err, createdDevice) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, userModel, createdDevice);
                });
            },

        ], function (err, userModel, deviceModel) {
            if (err) {
                return next(err);
            }
            session.register(req, res, userModel, { rememberMe: true, device: deviceModel });
        });
        

        //UserModel.findOne(criteria, DEFAULT_FIELDS, function (err, user) {

        //    if (err) {
        //        return next(err);
        //    }

        //    if (!user) {
        //        return next(badRequests.SignInError({message: 'Incorrect Minder ID'}));
        //    }

        //    if (user && user.confirmToken) {
        //        return next(badRequests.UnconfirmedEmail());
        //    }

        //    DeviceModel
        //        .findOne({
        //            deviceId: options.deviceId
        //        }, function (err, device) {
        //            var deviceData;

        //            if (err) {
        //                return next(err);
        //            } else if (device) {

        //                if (device.user.toString() === user._id.toString()) {
        //                    session.register(req, res, user, { rememberMe: true, device: device });
        //                } else {
        //                    next(badRequests.AccessError());
        //                }

        //            } else {
        //                //create device;
        //                deviceData = deviceHandler.prepareDeviceData(options);
        //                deviceData.deviceType = deviceHandler.getDeviceOS(req);

        //                deviceHandler.createDevice(deviceData, user, function (err, device) {

        //                    if (err) {
        //                        return next(err);
        //                    }

        //                    session.register(req, res, user, {rememberMe: true, device: device});
        //                });
        //            }
        //        });

        //});
    };

    this.signUp = function (req, res, next) {
        var options = req.body;

        async.series([

            //check captcha:
            function (cb) {
                var captchaOptions;

                if (!options.captchaChallenge || !options.captchaResponse) {
                    return cb();
                }

                captchaOptions = {
                    captchaChallenge: options.captchaChallenge,
                    captchaResponse: options.captchaResponse,
                    ip: req.ip
                };

                checkCaptcha(captchaOptions, function (err) {
                    if (err) {
                        return cb(err);
                    }

                    delete options.captchaChallenge;
                    delete options.captchaResponse;

                    cb();
                });
            },

            //validation:
            function (cb) {
                validateSignUp(options, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    cb();
                });
            },

            //create user:
            function (cb) {
                createUser(options, function (err, user) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, user);
                });
            }

        ], function (err, result) {
            var user = result[2];

            if (err) {
                return next(err);
            }

            mailer.emailConfirmation(user);

            res.status(201).send({
                success: 'success signUp',
                message: 'Thank you for registering with Minder. Please check your email and verify account',
                minderId: user.minderId
            });
        });
    };

    this.signIn = function (req, res, next) {
        var options = req.body;

        if (options.email && options.pass) {
            signInWeb(req, res, next);
        } else if (options.minderId && options.deviceId) {
            signInMobile(req, res, next);
        } else {
            return next(badRequests.NotEnParams({}));
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
                //return self.renderError(err, req, res);
                return next(err);
            }

            if (!userModel) {
                //return self.renderError(badRequests.NotFound(), req, res);
                return next(badRequests.NotFound());
            }

            //res.render('successConfirm');
            res.status(200).send({success: 'success confirmed'});

        });

    };

    this.getUserById = function (userId, options, callback) {
        var query = {
            _id: userId
        };
        var fields = {
            pass: false
        };

        UserModel.findOne(query, fields, function (err, user) {

            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
                return;
            }

            if (!user) {
                if (callback && (typeof callback === 'function')) {
                    callback(badRequests.NotFound());
                }
                return;
            }

            if (callback && (typeof callback === 'function')) {
                callback(null, user);
            }

        });

    };

    this.getCurrentUser = function (req, res, next) {
        var userId = req.session.userId;

        self.getUserById(userId, null, function (err, user) {
            if (err) {
                next(err);
            } else {
                res.status(200).send(user);
            }
        });
    };

    this.updateCurrentUserProfile = function (req, res, next) {
        var userId = req.session.userId;
        var options = req.body;
        var password = options.password;
        var newPassword = options.newPassword;
        var updateData = {};
        var errMessage = '';

        if (options.firstName) {
            if (options.firstName.length > CONSTANTS.USERNAME_MAX_LENGTH) {
                errMessage = 'First name cannot contain more than ' + CONSTANTS.USERNAME_MAX_LENGTH + ' symbols';
                return next(badRequests.InvalidValue({message: errMessage}));
            }
            updateData.firstName = options.firstName;
        }

        if (options.lastName) {
            if (options.lastName.length > CONSTANTS.USERNAME_MAX_LENGTH) {
                errMessage = 'Last name cannot contain more than ' + CONSTANTS.PASS_MIN_LENGTH + ' symbols';
                return next(badRequests.InvalidValue({message: errMessage}));
            }
            updateData.lastName = options.lastName;
        }

        if (options.email) {
            if (!REG_EXP.EMAIL_REGEXP.test(options.email)) {
                return next(badRequests.InvalidEmail());
            }
            updateData.email = options.email;
        }

        if (newPassword || password) {
            if (!newPassword || !password) { //most exists booth (password && newPassword) params
                return next(badRequests.NotEnParams({reqParams: ['password', 'newPassword']}));
            }

            if (newPassword.length < CONSTANTS.PASS_MIN_LENGTH) {
                errMessage = 'Password cannot contain less than ' + CONSTANTS.PASS_MIN_LENGTH + ' symbols';
                return next(badRequests.InvalidValue({message: errMessage}));
            }

            if (newPassword.length > CONSTANTS.PASS_MAX_LENGTH) {
                errMessage = 'Password cannot contain more than ' + CONSTANTS.PASS_MAX_LENGTH + ' symbols';
                return next(badRequests.InvalidValue({message: errMessage}));
            }
        }

        async.series([

            //check newPassword and modify the updateData:
            function (cb) {

                if (newPassword) {

                    UserModel.findOne({ // find a user to compare user's password ws options.password
                        _id: userId
                    }, function (err, user) {
                        if (err) {
                            return cb(err);
                        } else if (!user) {
                            return cb(badRequests.NotFound());
                        }

                        if (user.pass !== getEncryptedPass(password)) { //compare user's password ws options.password
                            return cb(badRequests.InvalidValue({message: 'Incorrect password'}));
                        }

                        updateData.pass = getEncryptedPass(newPassword); // encrypt new password and add to updateData:

                        cb();
                    });

                } else {
                    cb();
                }
            },

            //update profile data (firstName, lastName, email). Pass was checked in previous function;
            function (cb) {
                updateUserProfile(userId, updateData, function (err, user) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, user);
                });
            }

        ], function (err, result) {
            if (err) {
                return next(err);
            }
            res.status(200).send({success: 'updated', model: result[1]});
        });

    };

    this.forgotPassword = function (req, res, next) {
        var email = req.body.email;
        var criteria = {
            email: email
        };

        if (!email) {
            return next(badRequests.NotEnParams({reqParams: ['email']}));
        }

        UserModel.findOne(criteria, function (err, user) {
            if (err) {
                return next(err);
            } else if (!user) {
                return res.status(200).send({success: 'updated'});
            } else {
                user.forgotToken = tokenGenerator.generate();
                user.save(function (err, userModel) { // save changes and send email
                    if (err) {
                        return next(err);
                    }

                    mailer.forgotPassword(userModel);

                    res.status(200).send({success: 'updated'});
                });
            }
        });

    };

    this.resetPassword = function (req, res, next) {
        var token = req.body.token;
        var password = req.body.password;

        if (!token || !password) {
            return next(badRequests.NotEnParams({reqParams: ['token', 'password']}));
        }

        UserModel.findOne({
            forgotToken: token
        }, function (err, user) {
            if (err) {
                return next(err);
            } else if (!user) {
                return next(badRequests.NotFound());
            } else {
                user.pass = getEncryptedPass(password);
                user.forgotToken = null;
                user.save(function (err) {
                    if (err) {
                        return next(err);
                    }
                    res.status(200).send({success: 'updated'});
                });
            }
        });
    };

};

module.exports = UserHandler;