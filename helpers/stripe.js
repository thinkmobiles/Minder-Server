'use strict';

var stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
var StripeModule = function () {
    var self = this;

    this.currency = 'usd';

    this.createPlan = function(data, callback) {
        var err;

        if (!data || (typeof data !== 'object')) {
            err = new Error();
            err.message = 'Not enough incoming parameters. "data" is undefined!';

            if (callback && (typeof callback === 'function')) {
                callback(err);
            }
            return;
        }

        stripe.plans.create(data, function (err, plan) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
                return;
            }

            if (callback && (typeof callback === 'function')) {
                callback(null, plan);
            }
        });

    };

    this.createCustomer = function (data, callback) {
        var err;

        if (!data || (typeof data !== 'object')) {
            err = new Error();
            err.message = 'Not enough incoming parameters. "data" is undefined!';

            if (callback && (typeof callback === 'function')) {
                callback(err);
            }
            return;
        }

        stripe.customers.create(data, function (err, customer) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
                return;
            }

            if (callback && (typeof callback === 'function')) {
                callback(null, customer);
            }
        });
    };

    this.createCard = function (customerId, tokenId, callback) {
        var err;
        var sourceData;

        if (!customerId || !tokenId) {
            err = new Error();
            err.message = 'Not enough incoming parameters. "customerId" or "tokenId" is undefined!';

            if (callback && (typeof callback === 'function')) {
                callback(err);
            }
            return;
        }

        sourceData = {
            source: tokenId
        };

        stripe.customers.createSource(customerId, sourceData, function (err, card) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
                return;
            }

            if (callback && (typeof callback === 'function')) {
                callback(null, card);
            }
        });
    };

    this.updateCard = function (customerId, cardId, callback) {
        var err;
        var sourceData;

        if (!customerId || !cardId) {
            err = new Error();
            err.message = 'Not enough incoming parameters. "customerId" or "cardId" is undefined!';

            if (callback && (typeof callback === 'function')) {
                callback(err);
            }
            return;
        }

        sourceData = {
            source: cardId
        };

        stripe.customers.createSource(customerId, sourceData, function (err, card) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
                return;
            }

            if (callback && (typeof callback === 'function')) {
                callback(null, card);
            }
        });
    };

    this.listCards = function (customerId, callback) {
        var err;

        if (!customerId) {
            err = new Error();
            err.message = 'Not enough incoming parameters. "customerId" is undefined!';

            if (callback && (typeof callback === 'function')) {
                callback(err);
            }
            return;
        }

        stripe.customers.listCards(customerId, function (err, cards) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
                return;
            }

            if (callback && (typeof callback === 'function')) {
                callback(null, cards);
            }
        });
    };

    this.createSubscription = function (params, callback) {
        var err;
        var customerId;
        var planId;
        var quantity;
        var planParams;

        if (!params || !params.customerId || !params.planId || !params.quantity) {
            err = new Error();
            err.message = 'Not enough incoming parameters. "params.customerId" or "params.planId" or "params.quantity" is undefined!';

            if (callback && (typeof callback === 'function')) {
                callback(err);
            }
            return;
        }

        customerId = params.customerId;
        planParams = {
            plan: params.planId,
            quantity: params.quantity
        };

        stripe.customers.createSubscription(customerId, planParams, function (err, subscription) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
                return;
            }

            if (callback && (typeof callback === 'function')) {
                callback(null, subscription);
            }
        });
    };

    this.createCharge = function (params, callback) {
        var err;
        var amount;
        var chargeParams;

        if (!params || !params.amount || !params.source) {
            err = new Error();
            err.message = 'Not enough incoming parameters. "params.amount" or "params.source" is undefined!';

            if (callback && (typeof callback === 'function')) {
                callback(err);
            }
            return;
        }

        chargeParams = {
            amount: params.amount,
            currency: params.currency || self.currency,
            source: params.source
        };

        if (params.description) {
            chargeParams.description = params.description;
        }

        if (params.metadata) {
            chargeParams.metadata = params.metadata;
        }

        stripe.charges.create(chargeParams, function (err, charge) {
            if (err) {
                if (callback && (typeof callback === 'function')) {
                    callback(err);
                }
                return;
            }

            if (callback && (typeof callback === 'function')) {
                callback(null, charge);
            }
        });
    };

    this.stripe = stripe;
};

module.exports = new StripeModule();