var App = {
        File: {
            MAXSIZE: 10485760,  //size in kilobytes  = 3 MB
            MaxFileSizeDisplay: "10 MB"
        },
        requestedURL: null,
        Calendar: {
            currentCalendarId: ""
        }
    };

require.config({
    paths: {
        jQuery: './libs/jquery-2.1.0.min.map',
        costCounter: './libs/costCounter',
        Underscore: './libs/underscore-min.map.1.6.0',
        Bootstrap: './libs/bootstrap.min',
        Backbone: './libs/backbone-min.map.1.1.2',
        less: './libs/less.min',
        templates: '../templates',
        text: './libs/text',
        moment: './libs/moment',
        common: 'common',
        recaptcha: "//www.google.com/recaptcha/api/js/recaptcha_ajax",
        stripeCheckout: '//checkout.stripe.com/checkout'
    },
    shim: {
        'ajaxForm': ['jQuery'],
        'Bootstrap': ['jQuery'],
        'Backbone': ['Underscore', 'jQuery'],
        'app': ['Backbone', 'less', 'Bootstrap', 'moment', 'costCounter'],
        "recaptcha": {
            exports: 'Recaptcha'
        },
        "stripeCheckout": {
            exports: 'StripeCheckout'
        }
    },
    config: {
        moment: {
            noGlobal: true
        }
    }
});

require(['app'], function (app) {
    App.error = function (xhr) {
        if (xhr) {
            if (xhr.status === 401 || xhr.status === 403) {
                if (xhr.status === 401) {
                    if(App.sessionData.get('authorized')){
                        Backbone.history.navigate("login", {trigger: true});
                    }
                    App.sessionData.set({
                        authorized:false,
                        user:null
                    });
                } else {
                    alert("You do not have permission to perform this action");
                }
            } else {
                if (xhr.responseJSON) {
                    alert(xhr.responseJSON.error);
                } else {
                    console.log(xhr);
                    //Backbone.history.navigate("home", {trigger: true});
                }
            }
        }
    };


    app.initialize();
});
