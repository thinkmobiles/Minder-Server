define(['common'], function (common) {

    var runApplication = function (err, data) {
        var url = (App.requestedURL === null) ? Backbone.history.fragment : App.requestedURL;
        if ((url === "")) url = 'main';
        //if ((url === "") || (url === "login")) url = 'main';
        if (Backbone.history.fragment) {
            Backbone.history.fragment = '';
        }

        console.log('init err', err);
        console.log('--->',url);
        if (!err) {
            App.sessionData.set({
                authorized: true,
                admin: !!data.role,
                user: data
            });
            Backbone.history.navigate(url, {trigger: true});
        } else {
            //if (App.requestedURL === null)
            //App.requestedURL = Backbone.history.fragment;
            //Backbone.history.fragment = "";
            App.sessionData.set({
                authorized: false,
                admin: false,
                user: null
            });
            Backbone.history.navigate(url, {trigger: true});
            //Backbone.history.navigate("login", {trigger: true});
        }

    };


    return {
        runApplication: runApplication
    };
});
