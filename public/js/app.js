define([
    'router',
    'communication',
    'custom'
], function (Router, Communication, Custom) {

    // start application
    var initialize = function () {
        var appRouter;
        App.sessionData = new Backbone.Model({
            authorized: false,
            admin: false,
            user: null,
            date: null,
            tariffPlans: null
        });

        // get time from server
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

        // get plans from server
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

        // get date from server in intervals
        setInterval(getDateTime, 1000 * 60 * 50);

        App.sessionData.on('change:authorized', function () {
            if (App.sessionData.get('authorized')) {
                getPlans();
                getDateTime();
            }
        });

        appRouter = new Router();

        // append router to global scope
        App.router = appRouter;

        // start tracking the history
        Backbone.history.start({silent: true});

        // check login an then set first rout
        Communication.checkLogin(function(err, data){
            Custom.runApplication(err, data);
        });

    };
    return {
        initialize: initialize
    }
});
