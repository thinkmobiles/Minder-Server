var App = {
    //File: {
    //    MAXSIZE: 10485760,  //size in kilobytes  = 3 MB
    //    MaxFileSizeDisplay: "10 MB"
    //},
    //requestedURL: null,
    //Calendar: {
    //    currentCalendarId: ""
    //}
};

require.config({
    paths: {
        jQuery: './libs/jquery-2.1.0.min.map',
        costCounter: './libs/costCounter',
        Underscore: './libs/underscore-min.map.1.6.0',
        Bootstrap: './libs/bootstrap.min',
        Backbone: './libs/backbone-min.map.1.1.2',
        less: './libs/less.min',
        templates: '../templates', // templates dir not error
        text: './libs/text',
        common: 'common',
        recaptcha: "//www.google.com/recaptcha/api/js/recaptcha_ajax", // google recaptcha v1
        stripeCheckout: '//checkout.stripe.com/checkout' // stripe modal
    },
    shim: {
        'ajaxForm': ['jQuery'],
        'Bootstrap': ['jQuery'],
        'Backbone': ['Underscore', 'jQuery'],
        'app': ['Backbone', 'less', 'Bootstrap', 'costCounter'],
        "recaptcha": {
            exports: 'Recaptcha'
        },
        "stripeCheckout": {
            exports: 'StripeCheckout'
        }
    }
});

require(['app'], function (app) {

    // global error handler
    App.error = function (xhr) {
        if (xhr) {
            if (xhr.status === 401 || xhr.status === 403) {
                if (xhr.status === 401) {
                    if (App.sessionData.get('authorized')) {
                        Backbone.history.navigate("login", {trigger: true});
                    }
                    App.sessionData.set({
                        authorized: false,
                        user: null
                    });
                } else {
                    alert("You do not have permission to perform this action");
                }
            } else {
                if (xhr.responseJSON) {
                    alert(xhr.responseJSON.error);
                } else if (xhr.message) {
                    alert(xhr.message);
                } else {
                    console.error(xhr);
                }
            }
        }
    };

    App.updateUser = function () {  //update user data when subscription is change
        $.ajax({
            url: "/currentUser",
            type: "GET",
            success: function (data) {
                App.sessionData.set({
                    user: data
                })
            },
            error: function (data) {
                App.error(data);
            }
        });
    };


    app.initialize();
});
