(function () {
    function costCounter(data, cb) {
        var subscribedDevices    = data.user.billings.subscribedDevices;
        var selectedDevicesCount = data.selectedDevicesCount;
        var forCounter = data.forCounter;
        var plans      = data.plans;
        var devicesToPay = 0;
        var plan;
        var date   = data.date;
        var period = data.period || 'month';
        var maxDevicesForUser = 0;
        var expirationDate;
        var result;

        // get maximum of devices
        plans.forEach(function (currentPan) {
            if ((currentPan.metadata.type === period) && (currentPan.metadata.maxDevices > maxDevicesForUser)) {
                maxDevicesForUser = currentPan.metadata.maxDevices;
            }
        });

        if (period === 'month') {
            expirationDate = new Date(new Date(date).setMonth(date.getMonth() + 1));
        } else {
            expirationDate = new Date(new Date(date).setYear(date.getFullYear() + 1));
        }

        result = {
            amount              : 0,
            devicesToPay        : 0,
            subscribedDevices   : subscribedDevices,
            maxDevices          : 0,
            selectedDevicesCount: selectedDevicesCount
        };

        devicesToPay = selectedDevicesCount;
        subscribedDevices = subscribedDevices + selectedDevicesCount - forCounter;

        // check of maximum devices limit
        if (subscribedDevices > maxDevicesForUser) {
            cb(new Error('Out of maximum limit! Not allowed! Current is '
            + subscribedDevices + ', maximum is ' + maxDevicesForUser));
        }

        //if (subscribedDevices > MAX_DEVICES) { // TODO
        //    return cb(new Error('Out of maximum limit! Not allowed! Current is ' + subscribedDevices));
        //}


        for (var i = 0; i < plans.length; i++) {
            if (
                (subscribedDevices >= plans[i].metadata.minDevices)
                && (subscribedDevices <= plans[i].metadata.maxDevices)
                && (plans[i].metadata.type === period)
            ) {
                plan = plans[i];

                break;
            }
        }

        result.devicesToPay = devicesToPay;

        if (plan) {
            result.amount   = devicesToPay * plan.amount;
            result.plan     = plan.name;
            result.planData = plan;
            result.planId   = plan.id;
            result.plan_id  = plan._id;
            result.period   = period;
            result.maxDevices        = plan.metadata.maxDevices;
            result.subscribedDevices = subscribedDevices;
            result.expirationDate    = expirationDate;
        }

        cb(null, result);
    }

    if (typeof module === "undefined") {
        window.costCounter = costCounter;
    } else {
        module.exports = costCounter;
    }
})();