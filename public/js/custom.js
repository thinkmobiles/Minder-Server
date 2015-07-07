define([],function () {
    var runApplication = function (err, data) {
        var url;
        url =  Backbone.history.fragment || Backbone.history.getFragment();

        if ((url === "")) url = 'main';
        if (Backbone.history.fragment) {
            Backbone.history.fragment = '';
        }

        if (!err) {
            App.sessionData.set({
                authorized : true,
                admin      : !!data.role,
                user       : data
            });
            return Backbone.history.navigate(url, {trigger: true});
        } else {
            App.sessionData.set({
                authorized  : false,
                admin       : false,
                user        : null
            });
            return Backbone.history.navigate(url, {trigger: true});
        }

    };


    return {
        runApplication: runApplication
    };
});
