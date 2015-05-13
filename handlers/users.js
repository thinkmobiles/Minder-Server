'use strict';

var CONSTANTS = require('../constants/index');

var async = require('async');
var crypto = require("crypto");
var mongoose = require('mongoose');
var http = require('http');
var querystring = require('querystring');

var REG_EXP = require('../constants/regExp');

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
    var self = this;

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
            errMessage = 'First name cannot contain more than ' + CONSTANTS.PASS_MIN_LENGTH + ' symbols';
            return callback(badRequests.InvalidValue({message: errMessage}));
        }

        if (userData.lastName.length > CONSTANTS.USERNAME_MAX_LENGTH) {
            errMessage = 'Last name cannot contain more than ' + CONSTANTS.PASS_MIN_LENGTH + ' symbols';
            return callback(badRequests.InvalidValue({message: errMessage}));
        }

        if (!REG_EXP.EMAIL_REGEXP.test(userData.email)) {
            return callback(badRequests.InvalidEmail());
        }

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

        newUser.save(function (err, result) {
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

    this.signUp = function (req, res, next) {
        var options = req.body;

        async.series([

            //check captcha:
            function (cb) {
                var captchaOptions = {
                    captchaChallenge: options.captchaChallenge,
                    captchaResponse: options.captchaResponse,
                    ip: req.ip
                };

                if (deviceHandler.isMobile(req)) {
                    return cb(); //there is not required captcha
                }

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

    function signInWeb(req, res, next) {
        var options = req.body;
        var encryptedPass;
        var query;
        var fields;

        if (!options.email || !options.pass) {
            return next(badRequests.NotEnParams({reqParams: ['email', 'pass']}));
        }

        encryptedPass = getEncryptedPass(options.pass);
        query = {
            email: options.email,
            pass: encryptedPass
        };
        fields = {
            pass: false
        };

        UserModel.findOne(query, fields, function (err, user) {
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
                            session.register(req, res, user, {rememberMe: true}); //TODO:
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

                            session.register(req, res, user, {rememberMe: true});
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

    this.getUser = function (req, res, next) {
        var userId = req.params.id;

        self.getUserById(userId, null, function (err, user) {
            if (err) {
                next(err);
            } else {
                res.status(200).send(user);
            }
        });
    };

    this.getUsers = function (req, res, next) {
        var options = req.query;
        var page;
        var count;
        var query;
        var fields;
        var searchTerm;
        var criteria;

        if (options && options.count) {
            count = parseInt(options.count);
        } else {
            count = 10;
        }

        if (options && options.page) {
            page = (parseInt(options.page) - 1) * count;
        } else {
            page = 1;
        }

        criteria = {};
        fields = {
            pass: false
        };

        query = UserModel
            .find(criteria, fields)
            .sort('email')
            .limit(count)
            .skip(page);

        query.exec(function (err, users) {
            if (err) {
                next(err);
            } else {
                res.status(200).send(users);
            }
        });

    };

    this.getUsersCount = function (req, res, next) {
        var options = req.query;
        var criteria = {};
        var query;

        query = UserModel.count(criteria);

        query.exec(function (err, count) {
            if (err) {
                next(err);
            } else {
                res.status(200).send({count: count});
            }
        });
    };

    this.updateUser = function (req, res, next) {
        var userId = req.params.id;
        var options = req.body;

        updateUserProfile(userId, options, function (err, user) {
            if (err) {
                next(err);
            } else {
                res.status(200).send({success: 'udpated', model: user});
            }
        });
    };

    this.updateCurrentUserProfile = function (req, res, next) {
        var userId = req.session.userId;
        var options = req.body;
        var password = null;
        var newPassword = null;

        if (options.newPassword) { // check to need to update password
            if (!options.password) {
                return next(badRequests.NotEnParams(['password']));
            }
            var newPassword = options.newPassword;
        } else {
            delete options.password; // delete password if coms from user
        }

        if (newPassword) {
            // update profile and password
            UserModel.findOne({ // find a user to compare passwords
                _id: userId
            }, function (err, user) {
                if (err) {
                    next(err);
                } else if (!user) {
                    next(badRequests.NotFound());
                } else {

                    password = getEncryptedPass(options.password);

                    if (user.pass !== password) { //compare passwords
                        return next(badRequests.NotFound());
                    }

                    options.pass = getEncryptedPass(newPassword); // encrypt new password and add to options

                    updateUserProfile(userId, options, function (err, user) {
                        if (err) {
                            next(err);
                        } else {
                            res.status(200).send({success: 'udpated', model: user});
                        }
                    });
                }
            });
        } else { // update only profile
            updateUserProfile(userId, options, function (err, user) {
                if (err) {
                    next(err);
                } else {
                    res.status(200).send({success: 'udpated', model: user});
                }
            });
        }
    };

    /*this.incrementSubscribedDevicesCount = function(userId, quantity, callback) {
     var criteria = {
     _id: userId
     };
     var update = {
     $inc: {
     quantity: quantity,
     'billings.subscribedDevices': 1
     }
     };

     UserModel.findAndModify(criteria, update, function (err, numAffected) {
     if (err) {
     if (callback && (typeof callback === 'function')) {
     callback(err);
     }
     } else {
     if (callback && (typeof callback === 'function')) {
     callback(null, numAffected);
     }
     }
     });
     };*/

};

module.exports = UserHandler;