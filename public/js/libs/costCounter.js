(function () {
    function costCounter(data, cb) {
        var subscribedDevices = data.user.billings.subscribedDevices;
        var selectedDevicesCount = data.selectedDevicesCount;
        var plans = data.plans;
        var devicesToPay = 0;
        var plan;
        var date = data.date;
        var period = data.period;
        var maxDevicesForUser = 0;

        // get maximum of devices
        plans.forEach(function (currentPan) {
            if (currentPan.metadata.type === period && currentPan.metadata.maxDevices > maxDevicesForUser) {
                maxDevicesForUser = currentPan.metadata.maxDevices;
            }
        });

        var result = {
            amount: 0,
            devicesToPay: 0,
            subscribedDevices: subscribedDevices,
            maxDevices: 0,
            selectedDevicesCount: selectedDevicesCount
        };

        devicesToPay = selectedDevicesCount;
        subscribedDevices = subscribedDevices + selectedDevicesCount;

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
            result.amount = devicesToPay * plan.amount;
            result.plan = plan.name;
            result.planData = plan;
            result.planId = plan.id;
            result.plan_id = plan._id;
            result.period = period;
            result.maxDevices = plan.metadata.maxDevices;
            result.subscribedDevices = subscribedDevices;
            if (period === 'month') {
                result.expirationDate = new Date(new Date(date).setMonth(date.getMonth() + 1));
            } else {
                result.expirationDate = new Date(new Date(date).setYear(date.getFullYear() + 1));
            }
        }

        cb(null, result);
    }

    if (typeof module === "undefined") {
        window.costCounter = costCounter;
    } else {
        module.exports = costCounter;
    }
})();