'use strict';

var stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
var StripeModule = function () {

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

    this.subscribe = function () {
//userModel, deviceIds, plan
    };
};

module.exports = new StripeModule();