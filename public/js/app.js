// Filename: app.js
define([
    'router',
    'communication',
    'custom'
], function (Router, Communication, Custom) {

    var initialize = function () {
        App.sessionData = new Backbone.Model({
            authorized: false,
            admin: false
        });
        var appRouter = new Router();
        App.router = appRouter;
        Backbone.history.start();
        Communication.checkLogin(Custom.runApplication);

    };
    return {
        initialize: initialize
    }
});
