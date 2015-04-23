define(['common'], function (common) {

    var runApplication = function (success) {
        if (success) {
            var url = (App.requestedURL === null) ? Backbone.history.fragment : App.requestedURL;
            console.log('______', url);
            //if ((url === "") || (url === "login")) url = 'main';

            //Backbone.history.fragment = "";
            App.sessionData.set({
                authorized: true,
                admin: false
            });
            // Backbone.history.navigate(url, {trigger: true});

        } else {
            if (App.requestedURL === null)
                App.requestedURL = Backbone.history.fragment;
            Backbone.history.fragment = "";
            App.sessionData.set({
                authorized: false,
                admin: false
            });
            Backbone.history.navigate("login", {trigger: true});
        }
    };


    return {
        runApplication: runApplication
    };
});
