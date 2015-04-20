define([
    'custom',
    'views/menu/topMenuView',
    'views/menu/footerView',
    'common'
], function (custom, TopMenuView, FooterView, common) {

    var appRouter = Backbone.Router.extend({

        wrapperView: null,
        mainView: null,
        topBarView: null,
        view: null,

        routes: {
            "home": "any",
            "login": "login",
            "main": "main",
            "forgotPassword": "forgotPassword",
            "signUp": "signUp",
            "termsAndConditions": "termsAndConditions",
            "contactUs": "contactUs",
            "*any": "any"
        },

        initialize: function () {
            console.log('router init');
            this.topMenuView = new TopMenuView();
            //this.footerView = new FooterView();
        },

        loadWrapperView: function (name) {
            var self = this;
            require(['views/' + name + '/' + name + 'View'], function (View) {
                self[name + 'View'] = new View();
                self.changeWrapperView(self[name + 'View']);
            });
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
            this.loadWrapperView('main');
        },

        any: function () {
            this.loadWrapperView('main');
        },

        login: function () {
            this.loadWrapperView('login');
        },

        forgotPassword: function () {
            this.loadWrapperView('forgotPassword');
        },

        signUp: function () {
            this.loadWrapperView('signUp');
        },
        termsAndConditions: function () {
            this.loadWrapperView('termsAndConditions');
        },
        contactUs: function () {
            this.loadWrapperView('contactUs');
        }
    });

    return appRouter;
});


//define([
//    'views/main/MainView',
//    'views/login/LoginView',
//    'views/forgotPassword/forgotPasswordView',
//    'views/signUp/signUpView',
//    'views/termsAndConditions/termsAndConditionsView',
//    'views/contactUs/contactUsView',
//    'custom',
//    'views/menu/topMenuView',
//    'views/menu/footerView',
//    'common'
//], function (mainView, loginView, forgotPasswordView, signUpView, termsAndConditions, contactUs, custom, TopMenuView, FooterView, common) {
//
//    var appRouter = Backbone.Router.extend({
//
//        wrapperView: null,
//        mainView: null,
//        topBarView: null,
//        view: null,
//
//        routes: {
//            "home": "any",
//            "login": "login",
//            "main": "main",
//            "forgotPassword": "forgotPassword",
//            "signUp": "signUp",
//            "termsAndConditions": "termsAndConditions",
//            "contactUs": "contactUs",
//            "*any": "any"
//        },
//
//        initialize: function () {
//            console.log('router init');
//            this.topMenuView = new TopMenuView();
//            //this.footerView = new FooterView();
//        },
//
//        changeWrapperView: function (wrapperView) {
//            if (this.wrapperView) {
//                this.wrapperView.undelegateEvents();
//            }
//            this.wrapperView = wrapperView;
//        },
//
//        changeView: function (view) {
//            if (this.view) {
//                this.view.undelegateEvents();
//            }
//            $(document).trigger("resize");
//            this.view = view;
//        },
//
//        main: function (contentType) {
//            this.mainView = new mainView({contentType: contentType});
//            this.changeWrapperView(this.mainView);
//        },
//
//        any: function () {
//            this.mainView = new mainView();
//            this.changeWrapperView(this.mainView);
//        },
//
//        login: function () {
//            this.changeWrapperView(new loginView());
//        },
//
//        forgotPassword: function () {
//            this.changeWrapperView(new forgotPasswordView());
//        },
//
//        signUp: function () {
//            this.changeWrapperView(new signUpView());
//        },
//        termsAndConditions: function () {
//            this.changeWrapperView(new termsAndConditions());
//        },
//        contactUs: function () {
//            this.changeWrapperView(new contactUs());
//        }
//    });
//
//    return appRouter;
//});
