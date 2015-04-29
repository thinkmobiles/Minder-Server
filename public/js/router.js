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
            "login": "login",
            "main(/page/:page)": "main",
            "forgotPassword": "forgotPassword",
            "signUp": "signUp",
            "resetPassword/:token": "resetPassword",
            "billingInfo": "billingInfo",
            "termsAndConditions": "termsAndConditions",
            "devices": "devices",
            "device(/:id)": "device",
            "devices(/page/:page)": "devices",
            "profile": "profile",
            "*any": "any"
        },

        needAuthorize: [
            "main(/page/:page)",
            "billingInfo",
            "device(/:id)",
            "devices(/page/:page)",
            "profile",
        ],

        initialize: function () {
            this.topMenuView = new TopMenuView();
            //this.footerView = new FooterView();
        },

        loadWrapperView: function (name, params) {


            var self = this;
            require(['views/' + name + '/' + name + 'View'], function (View) {
                if (!self[name + 'View']) {
                    self[name + 'View'] = new View();
                }
                self.changeWrapperView(self[name + 'View'], params);
            });
        },

        changeWrapperView: function (wrapperView, params) {
            if (this.wrapperView) {
                this.wrapperView.undelegateEvents();
                $('#wrapper').html('');
            }

            $('#wrapper').html(wrapperView.el);
            wrapperView.delegateEvents();

            this.wrapperView = wrapperView;


            if (wrapperView.afterUpend) {
                wrapperView.afterUpend();
            }

            if (wrapperView.setParams) {
                wrapperView.setParams(params);
            }
        },

        changeView: function (view) {
            if (this.view) {
                this.view.undelegateEvents();
            }
            $(document).trigger("resize");
            this.view = view;
        },
        //checkLogin: function () {
        //    if (!App.sessionData.get('authorized')) {
        //        App.router.navigate("login", {trigger: true});
        //        this.loadWrapperView('login');
        //    }
        //    return !App.sessionData.get('authorized');
        //},
        main: function (page) {
            if (page) page = parseInt(page);
            if (this.checkLogin()) return;
            this.loadWrapperView('main', {page: page});
        },

        any: function () {
            if (this.checkLogin()) return;
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
        },
        profile: function () {
            if (this.checkLogin()) return;
            this.loadWrapperView('profile');
        },
        billingInfo: function () {
            if (this.checkLogin()) return;
            this.loadWrapperView('billingInfo');
        },
        devices: function (page) {
            if (page) page = parseInt(page);
            if (this.checkLogin()) return;
            this.loadWrapperView('devices', {page: page});
        },
        device: function (id) {
            if (this.checkLogin()) return;
            this.loadWrapperView('device', {id: id});
        },
        resetPassword: function (token) {
            this.loadWrapperView('resetPassword', {token: token});
        },
        userManagement: function (page) {
            if (this.checkLogin()) return;
            if (!App.sessionData.get('admin')) {
                return
            }
            if (page) page = parseInt(page);
            this.loadWrapperView('userManagement', {page: page});
        }
    });

    return appRouter;
});
