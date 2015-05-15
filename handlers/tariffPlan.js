'use strict';

var stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
var mongoose = require('mongoose');
var async = require('async');
//var _ = require('underscore');
var _ = require('lodash');

var STATUSES = require('../constants/deviceStatuses');
var badRequests = require('../helpers/badRequests');
var DeviceHandler = require('../handlers/devices');
var stripeModule = require('../helpers/stripe');

var TariffPlanHandler = function (db) {
    var deviceHandler = new DeviceHandler(db);
    var self = this;

    var tariffPlanSchema = mongoose.Schemas['TariffPlan'];
    var TariffPlan = db.model('TariffPlan', tariffPlanSchema);

    var userSchema = mongoose.Schemas['User'];
    var UserModel = db.model('User', userSchema);

    var deviceSchema = mongoose.Schemas['Device'];
    var DeviceModel = db.model('Device', deviceSchema);

    var calculateTariff = require('../public/js/libs/costCounter');

    function updateCards(stripeId, cards, token, callback) {
        //TODO: validation;

        async.waterfall([
            //remove old cards:
            function (cb) {
                cb(); //TODO: ...
            },

            //create new source:
            function (cb) {
                stripeModule.createCard(stripeId, token.id, function (err, card) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, card);
                });
            },

            //set default source:
            function (card, cb) {
                var updateData = {
                    default_source: card.id
                };

                stripeModule.stripe.customers.update(stripeId, updateData, function (err, customer) {
                    if (err) {
                        return cb(err);
                    }
                    cb();
                });
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

    function renewEnabled(userModel, token, callback) {
        var stripeId = '';
        var cardId = '';

        if (!userModel || !token) {
            if (callback && (typeof callback === 'function')) {
                callback(badRequests.NotEnParams({reqParams: ['userModel', 'token']}));
            }
            return;
        }

        if (token && token.card && token.card.id) {
            cardId = token.card.id
        } else {
            if (callback && (typeof callback === 'function')) {
                callback(badRequests.NotEnParams({reqParams: ['userModel', 'token', 'token.card.id']}));
            }
            return;
        }

        stripeId = userModel.billings.stripeId;

        if (!stripeId) {
            if (callback && (typeof callback === 'function')) {
                callback(badRequests.AccessError({message: 'You have not registered in Stripe'}));
            }
            return;
        }

        async.waterfall([

            //get the list of cards
            function (cb) {
                stripeModule.listCards(stripeId, function (err, cardsObject) {
                    var cards;
                    var cardIds;

                    if (err) {
                        return cb(err);
                    }

                    cards = cardsObject.data;
                    cardIds = _.pluck(cards, 'id');

                    if (cardIds.indexOf(cardId) === -1) { //cardId from token
                        cb(null, cards); //new credit card:
                    } else {
                        cb(null, null); //the card was not changed:
                    }

                });
            },

            function (oldCards, cb) {
                if (oldCards && oldCards.length) {

                    //create new card and remove if there oldCard parameter:
                    updateCards(stripeId, oldCards, token, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb();
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
    }

    function renewDisabled(userModel, token, callback) {
        var stripeId = userModel.billings.stripeId;
        var cardId = token.card.id;

        async.series([

            //TODO: check customers data after delete;

            //remove the card-source:
            function (cb) {
                stripeModule.stripe.customers.deleteCard(stripeId, cardId, function (err, confirmation) {
                    if (err) {
                        return cb(err);
                    }
                    cb();
                });
            },

            //update the customers default_source to NULL:
            function (cb) {
                var updateData = {
                    default_source: null
                };

                stripeModule.stripe.customers.update(stripeId, updateData, function (err, customer) {
                    if (err) {
                        return cb(err);
                    }
                    cb();
                });
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

    this.renewal = function (req, res, next) {
        var userId = req.session.userId;
        var options = req.body;
        var type = options.renewEnabled;
        var token = options.token;

        if (type === undefined) {
            return next(badRequests.NotEnParams({reqParams: 'type'}));
        }

        if ((type === true) && !token) {
            return next(badRequests.NotEnParams({reqParams: ['type', 'token']}));
        }

        async.waterfall([

            //find the user:
            function (cb) {
                var criteria = {
                    _id: userId
                };

                UserModel.findOne(criteria, function (err, userModel) {
                    if (err) {
                        return cb(err);
                    }
                    cb(null, userModel);
                });
            },

            //create / remove stripe source:
            function (userModel, cb) {
                if (type) {
                    renewEnabled(userModel, token, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, userModel);
                    });
                } else {
                    renewDisabled(userModel, token, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, userModel);
                    });
                }
            },

            //update UserModel:
            function (userModel, cb) {
                var saveData;

                if (userModel.billings.renewEnabled !== type) {

                    saveData = {
                        "billings.renewEnabled": type,
                        updatedAt: new Date()
                    };

                    userModel.save(saveData, function (err, updatedUserModel) {
                        if (err) {
                            return cb(err);
                        }
                        cb(null, updatedUserModel);
                    });

                } else {
                    cb(null, userModel);
                }
            },

            //update DeviceModels:
            function (userModel, cb) {
                /*var criteria;
                var updateData;

                DeviceModel.update()*/

                cb(); //TODO ...
            }

        ], function (err) {
            if (err) {
                return next(err);
            }
            res.status(200).send({success: 'updated'});
        });
    };

    function getStripeTariffs(callback) {
        TariffPlan.find({}, function (err, plans) {
            if (err) {
                return callback(err);
            }
            callback(null, plans);
        })
    }

    this.getTariffPans = function (req, res, next) {
        getStripeTariffs(function (err, plans) {
            if (err) {
                next(err);
            }
            res
                .status(200)
                .send(plans);
        });
    };

    this.subscribe = function (req, res, next) {
        res.status(500).send({error: 'Not Implemented'});

        /*var tokenObject = req.body.tokenObject; //TODO: token
         var devices = req.body.devices;//TODO deviceIds
         var userId = req.session.userId;
         var plan = null;
         var deviceIds = devices;

         if (!tokenObject) {
         return next(badRequests.NotEnParams({reqParams: ['token', 'deviceIds']}));
         }

         if (!deviceIds || deviceIds.length === 0) {
         return next(badRequests.NotEnParams({reqParams: ['token', 'deviceIds']}));
         }

         async.parallel({

         user: function (cb) {
         UserModel.findById(userId, function (err, user) {
         if (err) {
         return cb(err);
         }
         cb(null, user);
         });
         },

         plans: function (cb) {
         var criteria = {};

         TariffPlan.find(criteria, function (err, plans) {
         if (err) {
         return cb(err);
         }
         cb(null, plans)
         });
         },

         checkSubscribedDevices: function (cb) {
         var criteria = {
         user: userId,
         status: STATUSES.SUBSCRIBED,
         _id: {
         $in: deviceIds
         }
         };
         var fields = '_id';

         DeviceModel.find(criteria, fields, function (err, devices) {
         if (err) {
         cb(err);
         } else if (devices && devices.length) {
         cb(badRequests.DeviceIdInUse());
         } else {
         cb();
         }
         });
         }

         }, function (err, results) {
         var userModel = results.user;
         var plans = results.plans;
         var customerData;

         plan = calculateTariff({
         date: new Date(),
         plans: plans,
         user: userModel,
         selectedDevicesCount: deviceIds.length
         });

         if (!userModel.stripeId) {
         customerData = {
         plan: plan.id,
         quantity: deviceIds.length,
         source: tokenObject.id,
         email: userModel.email
         };

         stripe.customers.create(customerData, function (err, customer) {
         if (err) {
         return next(err);
         }

         res.status(200).send(customer);
         });

         } else {
         //TODO: ...
         }

         });*/
    };

    //this.getStripeCustomers = function(req, res, next){
    //    stripe.customers.list(
    //        function(err, customers) {
    //            if (err){
    //                console.log(err);
    //                return next(err);
    //            }
    //            console.log(err, customers);
    //            res.send(customers);
    //        }
    //    );
    //}
};

module.exports = TariffPlanHandler;