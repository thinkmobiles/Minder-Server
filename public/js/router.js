// Filename: router.js
define([
    'views/main/MainView',
    'views/login/LoginView',
    'custom',
    'common'
], function (mainView, loginView, custom, common) {

    var appRouter = Backbone.Router.extend({

        wrapperView: null,
        mainView: null,
        topBarView: null,
        view: null,

        routes: {
            "home": "any",
            "login": "login",
            "main": "main",
            "*any": "any"
        },

        initialize: function () {
            console.log('router init');
        },

        changeWrapperView: function (wrapperView) {
            if (this.wrapperView) {
                this.wrapperView.undelegateEvents();
            }
            this.wrapperView = wrapperView;
        },

        changeView: function (view) {
            if (this.view) {
                this.view.undelegateEvents();
            }
            $(document).trigger("resize");
            this.view = view;
        },

        main: function (contentType) {
            this.mainView = new mainView({contentType: contentType});
            this.changeWrapperView(this.mainView);
        },

        any: function () {
            this.mainView = new mainView();
            this.changeWrapperView(this.mainView);
        },

        login: function () {
            this.changeWrapperView(new loginView());
        }
    });

    return appRouter;
});
