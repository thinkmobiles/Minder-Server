define(['common'], function (common) {

    var runApplication = function (err, data) {
        var url = (App.requestedURL === null) ? Backbone.history.fragment : App.requestedURL;
        if ((url === "")) url = 'main';
        if (Backbone.history.fragment) {
            Backbone.history.fragment = '';
        }

        if (!err) {
            App.sessionData.set({
                authorized: true,
                admin: !!data.role,
                user: data
            });
            Backbone.history.navigate(url, {trigger: true});
        } else {
            App.sessionData.set({
                authorized: false,
                admin: false,
                user: null
            });
            Backbone.history.navigate(url, {trigger: true});
        }

    };


    return {
        runApplication: runApplication
    };
});
