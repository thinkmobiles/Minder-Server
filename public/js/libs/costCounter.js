(function () {
    function daysInMonth(month, year) {
        return new Date(year, month, 0).getDate();
    }

    function costCounter(data, cb) {
        var subscribedDevices = data.user.billings.subscribedDevices;
        var selectedDevicesCount = data.selectedDevicesCount;
        var plans = data.plans;
        var devicesToPay = 0;
        var plan;
        var date = data.date;
        var daysInThisMonth = daysInMonth((date.getMonth() + 1), date.getFullYear());
        var daysLeft = (daysInThisMonth - date.getDate() + 1);
        var period = data.period;
        var MAX_DEVICES = 1;

        var result = {
            amount: 0,
            devicesToPay: 0,
            subscribedDevices: subscribedDevices,
            maxDevices: 0,
            selectedDevicesCount: selectedDevicesCount,
            daysLeft: daysLeft
        };

        devicesToPay = selectedDevicesCount;
        subscribedDevices = subscribedDevices + selectedDevicesCount;

        if (subscribedDevices > MAX_DEVICES) { // TODO
            return cb(new Error('Out of maximum limit! Not allowed! Current is '+ subscribedDevices));
        }

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
            //result.amount = (((devicesToPay * (plan.amount / 100)) / daysInThisMonth) * daysLeft);
            result.amount = devicesToPay * plan.amount;
            result.plan = plan.name;
            result.planData = plan;
            result.planId = plan.id;
            result.plan_id = plan._id;
            result.period = period;
            result.maxDevices = plan.metadata.maxDevices;
            //result.amount = Math.round(result.amount * 100) / 100;
            result.subscribedDevices = subscribedDevices;
        }

        cb(null, result);
    }

    if (typeof module === "undefined") {
        window.costCounter = costCounter;
    } else {
        module.exports = costCounter;
    }
})();