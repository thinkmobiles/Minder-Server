// Filename: app.js
define([
    'router',
    'communication',
    'custom'
], function (Router, Communication, Custom) {

    var initialize = function () {
        App.sessionData = new Backbone.Model({
            authorized: false,
            admin: false,
            user: null,
            date:null,
            tariffPlans:null
        });
        function getDateTime(){
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

        function getPlans(){
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

        setInterval(getDateTime,1000*60*60);
        getDateTime();
        getPlans();

        var appRouter = new Router();
        App.router = appRouter;
        Backbone.history.start({silent: true});
        Communication.checkLogin(Custom.runApplication);

    };
    return {
        initialize: initialize
    }
});
