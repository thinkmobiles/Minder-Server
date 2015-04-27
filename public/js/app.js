// Filename: app.js
define([
    'router',
    'communication',
    'custom'
], function (Router, Communication, Custom) {

    var initialize = function () {
        App.sessionData = new Backbone.Model({
            authorized: false,
            admin: false,
            user: null,
            date:null,
            tariffPlans:null
        });
        function getDateTime(){
            $.ajax({
                url: '/now',
                type: "GET",
                dataType: 'json',
                success: function (data) {
                    App.sessionData.set({
                        date: new Date(data.now)
                    });
                },
                error: function (err) {
                    App.error(err);
                }
            });
        }

        setInterval(getDateTime,1000*60*60);
        getDateTime();


        //this.tariffPlansCollection = new TariffPlansCollection();
        App.sessionData.set({
            tariffPlans:[
                {
                    name: 'T1',
                    description: 'lololo',
                    cost: 1,
                    minDevices: 1,
                    maxDevices: 2,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }, {
                    name: 'T2',
                    description: 'lololo',
                    cost: 2.50,
                    minDevices: 3,
                    maxDevices: 4,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }, {
                    name: 'T3',
                    description: 'lololo',
                    cost: 5.0,
                    minDevices: 5,
                    maxDevices: 10,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }, {
                    name: 'T4',
                    description: 'lololo',
                    cost: 10,
                    minDevices: 11,
                    maxDevices: 50,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }, {
                    name: 'T5',
                    description: 'lololo',
                    cost: 20,
                    minDevices: 51,
                    maxDevices: 500,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]
        });



        var appRouter = new Router();
        App.router = appRouter;
        Backbone.history.start({silent: true});
        Communication.checkLogin(Custom.runApplication);

    };
    return {
        initialize: initialize
    }
});
