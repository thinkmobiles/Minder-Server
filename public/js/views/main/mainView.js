define([
    'text!templates/main/MainTemplate.html',
    'views/map/mapView',
    'collections/devicesCollection',
    'views/device/deviceMainListView'
], function (MainTemplate, mapView, DevisesCollection, deviceMainListView) {

    var MainView = Backbone.View.extend({
        el: '#wrapper',
        events: {
            //'click .deviseMainPageCheck': 'updateCheck',
            //'click': 'hideProp'
        },

        stateModel: new Backbone.Model({}),

        initialize: function (options) {
            var devicesData = [
                {
                    user: 'sdfsdfsdfafdaffsfdsda',
                    minderId: 'asdfasdfasfasfdasdf',
                    deviceId: 'adfasfadfaff asd fa dfa afdsf ',
                    deviceType: 'Windows',
                    name: 'My windows phone',
                    enabledTrackLocation: true,
                    isPayed: true,
                    lastLocation: {
                        long: 10.10,
                        lat: 10.10,
                        accuracy: 1200,  // meters
                        dateTime: new Date()
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                }, {
                    user: 'sdfsdfsdf',
                    minderId: 'asdfasdfasfdasdf',
                    deviceId: 'sdfs asd fa dfa afdsf ',
                    deviceType: 'ios',
                    name: 'My new phone',
                    enabledTrackLocation: true,
                    isPayed: true,
                    lastLocation: {
                        long: 11.10,
                        lat: 11.10,
                        accuracy: 1200,  // meters
                        dateTime: new Date()
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                }, {
                    user: 'sdfsdfdff',
                    minderId: 'asdfasd45sfdasdf',
                    deviceId: 'adfasfadfasdfsff asd fa dfa afdsf ',
                    deviceType: 'ios',
                    name: 'LOLOLO',
                    enabledTrackLocation: true,
                    isPayed: true,
                    lastLocation: {
                        long: 12.10,
                        lat: 9.10,
                        accuracy: 1200,  // meters
                        dateTime: new Date()
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                }, {
                    user: 'sdfsdfdff',
                    minderId: 'asdfasd45sfdasdf',
                    deviceId: 'adfasfadfasdfsff asd fa dfa afdsf ',
                    deviceType: 'ios',
                    name: 'WTF',
                    enabledTrackLocation: true,
                    isPayed: true,
                    lastLocation: {
                        long: 11.10,
                        lat: 9.10,
                        accuracy: 1200,  // meters
                        dateTime: new Date()
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];

            this.devisesCollection = new DevisesCollection(devicesData);

            this.render();
            this.mapView = new mapView();
            //this.listenTo(this.devisesCollection, 'change', this.render);
        },
        renderDevices: function () {
            var devicesList = this.$el.find('#devicesMainList');
            this.devisesCollection.map(function (device) {
                var view = new deviceMainListView({model: device});
                devicesList.append(view.$el);
            });
        },
        render: function () {
            var self = this;
            //dataService.getData('/currentUser', null, function (response, context) {
            //    if (response && response.profile && response.profile.profileName == 'baned') {
            //        $('title').text("EasyERP");
            //        context.$el.find("li#userpage").remove();
            //        context.$el.find("#top-bar").addClass("banned");
            //        context.$el.find("#content-holder").append("<div id = 'banned'><div class='icon-banned'></div><div class='text-banned'><h1>Sorry, this user is banned!</h1><p>Please contact the administrator.</p></div></div>");
            //    }
            //    if (response.RelatedEmployee) {
            //        $("#loginPanel .iconEmployee").attr("src", response.RelatedEmployee.imageSrc);
            //        if (response.RelatedEmployee.name) {
            //            $("#loginPanel  #userName").text(response.RelatedEmployee.name.first + " " + response.RelatedEmployee.name.last);
            //        } else {
            //            $("#loginPanel  #userName").text(response.login);
            //        }
            //    } else {
            //        $("#loginPanel .iconEmployee").attr("src", response.imageSrc);
            //        $("#loginPanel  #userName").text(response.login);
            //    }
            //}, this);
            this.$el.html(_.template(MainTemplate));
            this.renderDevices();
            return this;
        }
    });
    return MainView;
});