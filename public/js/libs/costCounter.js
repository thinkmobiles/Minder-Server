(function () {
    function daysInMonth(month, year) {
        return new Date(year, month, 0).getDate();
    }

    function costCounter(data) {
        //var monthSubscribedDevices = data.user.billings.monthSubscribedDevices;
        var subscribedDevices = data.user.billings.subscribedDevices;
        var selectedDevicesCount = data.selectedDevicesCount;
        var plans = data.plans;
        var devicesToPay = 0;
        var newPlan = false;
        var plan = data.user.currentPlan;
        var date = data.date;
        var daysInThisMonth = daysInMonth((date.getMonth() + 1), date.getFullYear());
        var daysLeft = (daysInThisMonth - date.getDate() + 1);

        if (plan) {
            for (var i = 0; i < plans.length; i++) {
                if (plans[i]._id === plan) {
                    plan = plans[i].name;
                    break;
                }
            }
        }

        var result = {
            plan: plan,
            costForThisMonth: 0,
            devicesToPay: 0,
            subscribedDevices: subscribedDevices,
            maxDevices: 0,
            selectedDevicesCount: selectedDevicesCount,
            daysLeft: daysLeft
        };

        devicesToPay = selectedDevicesCount;
        subscribedDevices = subscribedDevices + selectedDevicesCount;

        if (subscribedDevices) {
            for (var i = 0; i < plans.length; i++) {
                if (subscribedDevices >= plans[i].metadata.minDevices && subscribedDevices <= plans[i].metadata.maxDevices) {
                    plan = plans[i];
                    newPlan = true;
                    break;
                }
            }
        }

        if (!newPlan) {
            for (var i = 0; i < plans.length; i++) {
                if (plan === plans[i].name) {
                    plan = plans[i];
                    break;
                }
            }
        }



        result.devicesToPay = devicesToPay;
        if (plan) {
            result.costForThisMonth = (((devicesToPay * (plan.amount / 100)) / daysInThisMonth) * daysLeft);
            result.plan = plan.name;
            result.planId = plan.id;
            result.plan_id = plan._id;
            result.maxDevices = plan.metadata.maxDevices;
            result.costForThisMonth = Math.round(result.costForThisMonth * 100) / 100;
            result.subscribedDevices = subscribedDevices;
        }
        console.log(result);
        return result;
    }

    if (typeof module === "undefined") {
        window.costCounter = costCounter;
    } else {
        module.exports = costCounter;
    }
})();