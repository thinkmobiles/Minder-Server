// Filename: app.js
define([
    'router',
    'communication',
    'custom',
], function (Router, Communication, Custom) {

    var initialize = function () {
        var appRouter = new Router();

        appRouter.checkLogin = Communication.checkLogin;
        //Communication.checkLogin(Custom.runApplication);
        Backbone.history.start();
    };
    return {
        initialize: initialize
    }
});
