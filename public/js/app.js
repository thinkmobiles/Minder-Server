define([
    'router',
    'communication',
    'custom'
], function (Router, Communication, Custom) {

    var initialize = function () {
        var appRouter;
        App.sessionData = new Backbone.Model({
            authorized: false,
            admin: false,
            user: null,
            date: null,
            tariffPlans: null
        });
        function getDateTime() {
            $.ajax({
                url: '/now',
                type: "GET",
                dataType: 'json',
                success: function (data) {
                    App.sessionData.set({
                        date: new Date(data.now)
                    });
                },
                error: function (err) {
                    App.error(err);
                }
            });
        }

        function getPlans() {
            if (App.sessionData.get('tariffPlans')) {
                return
            }
            $.ajax({
                url: '/tariffPlans',
                type: "GET",
                dataType: 'json',
                success: function (data) {
                    App.sessionData.set({
                        tariffPlans: data
                    });
                },
                error: function (err) {
                    App.error(err);
                }
            });
        }

        setInterval(getDateTime, 1000 * 60 * 50);

        App.sessionData.on('change:authorized', function () {
            if (App.sessionData.get('authorized')) {
                getPlans();
                getDateTime();
            }
        });

        appRouter = new Router();
        App.router = appRouter;
        Backbone.history.start({silent: true});
        Communication.checkLogin(function(err, data){
            Custom.runApplication(err, data);
        });

    };
    return {
        initialize: initialize
    }
});
