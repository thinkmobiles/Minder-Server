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
            "login"                     :  "login",
            "main(/page/:page)"         :  "main",
            "forgotPassword"            :  "forgotPassword",
            "signUp"                    :  "signUp",
            "resetPassword/:token"      :  "resetPassword",
            "billingInfo(/:subscribe)"  :  "billingInfo",
            "photoList"                 :  "photoList",
            "termsAndConditions"        :  "termsAndConditions",
            "devices"                   :  "devices",
            //"device(/:id)"            :  "device",
            "devices(/page/:page)"      :  "devices",
            "profile"                   :  "profile",
            "confirm"                   :  "confirm",
            "confirmEmail/:token"       :  "confirmEmail",
            "*any"                      :  "any"
        },

        needAuthorize: [
            "main",
            "billingInfo",
            "photoList",
            "device",
            "devices",
            "profile"
        ],

        redirectWhenAuthorize: [
            'login',
            'signUp',
            'forgotPassword',
            'resetPassword',
            'confirm'
        ],

        initialize: function () {
            new TopMenuView();
        },

        // load and create view if is exist
        loadWrapperView: function (name, params) {
            var WrongRout = null;

            // show only permitted pages
            if (!App.sessionData.get('authorized')) {
                // access only authorized views
                WrongRout = _.find(this.needAuthorize, function (rout) {
                    if (name === rout) {
                        return true
                    }
                });
                if (WrongRout) {
                    return Backbone.history.navigate("login", {trigger: true});
                }
            } else {
                // access not authorized views
                WrongRout = _.find(this.redirectWhenAuthorize, function (rout) {
                    if (name === rout) {
                        return true
                    }
                });
                if (WrongRout) {
                    return Backbone.history.navigate("main", {trigger: true});
                }
            }

            //create new view if it not created before
            var self = this;
            require(['views/' + name + '/' + name + 'View'], function (View) {
                if (!self[name + 'View']) {
                    self[name + 'View'] = new View();
                }
                // append view
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

            // hook
            // using for clenaning
            if (wrapperView.afterUpend) {
                wrapperView.afterUpend();
            }

            // hook and aplay query params
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
        photoList: function () {
            this.loadWrapperView('photoList');
        },
        devices: function (page) {
            if (page) page = parseInt(page);
            this.loadWrapperView('devices', {page: page});
        },
        /*device: function (id) {
            this.loadWrapperView('device', {id: id});
        },*/
        resetPassword: function (token) {
            this.loadWrapperView('resetPassword', {token: token});
        },
        confirm:function(){
            this.loadWrapperView('confirm');
        },
        confirmEmail:function(token){
            this.loadWrapperView('confirmEmail', {token: token});
        }

    });

    return appRouter;
});
