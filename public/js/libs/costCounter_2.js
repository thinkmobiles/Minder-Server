/*
* Version: 2.0;
* Plan types: month / year;
* User can subscribe the first device as free;
* */

(function () {
    'use strict';

    function costCounter(params, callback) {
        var err;
        var userModel;
        var planModels;
        var devices;
        var result;
        var totalCount;
        var period;
        var planModel;
        var expirationDate;
        var amount;
        var activeDevicesArray = [];
        var validDevicesArray = [];
        var now = new Date();

        if (!params || !params.plans || !params.plans.length) {
            err = new Error('Not enough incoming parameters. "params.plans" is undefined');
            if (callback && (typeof callback === 'function')) {
                callback(err);
            } else {
                throw err;
            }
        }

        if (!params || !params.user ) {
            err = new Error('Not enough incoming parameters. "params.user" is undefined');
            if (callback && (typeof callback === 'function')) {
                callback(err);
            } else {
                throw err;
            }
        }

        userModel = params.user;
        planModels = params.plans;
        devices = params.devices || [];
        period = params.period || 'month';
        period = period.toLowerCase();

        devices.forEach(function (device) {
            if (device.status === 1) {        //active
                validDevicesArray.push(device);
                activeDevicesArray.push(device);
            } else if (device.status === 2) { //subscribed
                validDevicesArray.push(device);
            } else {
                //console.log('device has status "deleted"');
            }
        });

        totalCount = userModel.billings.subscribedDevices + activeDevicesArray.length;

        for (var i = 0; i < planModels.length; i++) {
            if (
                (totalCount >= planModels[i].metadata.minDevices)
                && (totalCount <= planModels[i].metadata.maxDevices)
                && (planModels[i].metadata.type === period)
            ) {
                planModel = planModels[i];
                break;
            }
        }

        amount = devices.length * planModel.amount;

        if (period === 'month') {
            expirationDate = new Date(new Date(now).setMonth(now.getMonth() + 1));
        } else {
            expirationDate = new Date(new Date(now).setYear(now.getFullYear() + 1));
        }

        result = {
            amount: amount,
            planModel: planModel,
            expirationDate: expirationDate,
            subscribedDevices: totalCount,
            devicesToPay: validDevicesArray.length
        };

        if (callback && (typeof callback === 'function')) {
            callback(null, result);
        }
    }

    if (typeof module === 'undefined') {
        window.costCounter = costCounter;
    } else {
        module.exports = costCounter;
    }
})();