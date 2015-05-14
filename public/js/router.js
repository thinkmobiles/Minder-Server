define([
    'custom',
    'views/menu/topMenuView'
], function (custom, TopMenuView) {

    var appRouter;
    appRouter = Backbone.Router.extend({

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
            "billingInfo(/:subscribe)": "billingInfo",
            "termsAndConditions": "termsAndConditions",
            "devices": "devices",
            "device(/:id)": "device",
            "devices(/page/:page)": "devices",
            "profile": "profile",
            "*any": "any"
        },

        needAuthorize: [
            "main",
            "billingInfo",
            "device",
            "devices",
            "profile"
        ],

        redirectWhenAuthorize: [
            'login',
            'signUp',
            'forgotPassword',
            'resetPassword'
        ],

        initialize: function () {
            new TopMenuView();
        },

        loadWrapperView: function (name, params) {
            var WrongRout = null;

            if (!App.sessionData.get('authorized')) {
                WrongRout = _.find(this.needAuthorize, function (rout) {
                    if (name === rout) {
                        return true
                    }
                });
                if (WrongRout) {
                    return Backbone.history.navigate("login", {trigger: true});
                }
            } else {
                WrongRout = _.find(this.redirectWhenAuthorize, function (rout) {
                    if (name === rout) {
                        return true
                    }
                });
                if (WrongRout) {
                    return Backbone.history.navigate("main", {trigger: true});
                }
            }


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

        main: function (page) {
            if (page) page = parseInt(page);
            this.loadWrapperView('main', {
                page: page,
                modal: false
            });
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
        },
        profile: function () {
            this.loadWrapperView('profile');
        },
        billingInfo: function (subscribe) {
            this.loadWrapperView('billingInfo', {
                subscribe: subscribe
            });
        },
        devices: function (page) {
            if (page) page = parseInt(page);
            this.loadWrapperView('devices', {page: page});
        },
        device: function (id) {
            this.loadWrapperView('device', {id: id});
        },
        resetPassword: function (token) {
            this.loadWrapperView('resetPassword', {token: token});
        },
        userManagement: function (page) {
            if (!App.sessionData.get('admin')) {
                return
            }
            if (page) page = parseInt(page);
            this.loadWrapperView('userManagement', {page: page});
        }
    });

    return appRouter;
});
