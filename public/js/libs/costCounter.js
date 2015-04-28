(function () {
    function daysInMonth(month, year) {
        return new Date(year, month, 0).getDate();
    }

    function costCounter(data) {
        var monthSubscribedDevices = data.user.billings.monthSubscribedDevices;
        var subscribedDevices = data.user.billings.subscribedDevices;
        //var expirationDate = data.user.billings.subscribedDevices;
        var active = data.user.billings.active;
        var selectedDevicesCount = data.selectedDevicesCount;
        var plans = data.plans;
        var devicesToPay = 0;
        var newPlan = false;
        var plan = data.user.currentPlan;
        var date = data.date;
        var daysInThisMonth = daysInMonth((date.getMonth() + 1), date.getFullYear());
        var daysLeft = (daysInThisMonth - date.getDate()+ 1);

        if(plan){
            for(var i = 0; i< plans.length; i++){
                if(plans[i]._id === plan){
                    plan = plans[i].name;
                    break;
                }
            }
        }

        var result = {
            plan: plan,
            costForThisMonth: 0,
            devicesToPay: 0,
            monthSubscribedDevices: monthSubscribedDevices,
            subscribedDevices: subscribedDevices,
            maxDevices: 0,
            selectedDevicesCount: selectedDevicesCount,
            daysLeft: daysLeft
        };

        if (selectedDevicesCount) {
            for (var i = 0; i < plans.length; i++) {
                if (selectedDevicesCount >= plans[i].minDevices && selectedDevicesCount <= plans[i].maxDevices) {
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

        if (active) {
            devicesToPay = (monthSubscribedDevices - subscribedDevices) + selectedDevicesCount;
        } else {
            devicesToPay = selectedDevicesCount;
        }

        result.devicesToPay = devicesToPay;
        if (plan) {
            result.costForThisMonth = (((devicesToPay * plan.cost)/daysInThisMonth)*daysLeft);
            result.plan = plan.name;
            result.maxDevices = plan.maxDevices;
            result.costForThisMonth = Math.round(result.costForThisMonth * 100) / 100;
        }
        return result;
    }

    if (typeof module === "undefined") {
        window.costCounter = costCounter;
    } else {
        module.exports = costCounter;
    }
})();