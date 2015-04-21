define([
    'text!templates/main/MainTemplate.html',
    'views/map/mapView',
    'collections/devicesCollection',
    'views/device/deviceMainListView'
], function (MainTemplate, mapView, DevisesCollection, deviceMainListView) {

    var MainView = Backbone.View.extend({
        el: '#wrapper',
        events: {
            'click #globalDevicesChecker': 'globalcheckTriger',
            'click #mapLocateButton': 'locate'
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
            this.deviceViews = [];

            this.render();
            this.mapView = new mapView();
            this.selectedViewsCollection = new Backbone.Collection();
            this.curentViewsCollection = new Backbone.Collection();
            //this.listenTo(this.selectedItemsCollection, 'change', this.renderDevices);

            //this.listenTo(this.devisesCollection, 'change', this.render);
        },


        renderDevices: function () {
            //var self = this;
            var devicesList = this.$el.find('#devicesMainList');
            //devicesList.html('');
            this.devisesCollection.map(function (device) {
                var view = new deviceMainListView({model: device});
                self.listenTo(view.stateModel, 'change', self.itemChecked);
                this.curentViewsCollection.add(view);
                devicesList.append(view.$el);
            });
        },

        globalcheckTriger: function () {
            var checked = this.$el.find('#globalDevicesChecker').prop('checked');
            var deviceViews = this.deviceViews;
            for (var i = 0; deviceViews.length > i; i++) {
                deviceViews[i].model.set({checked: checked});
            }
        },
        itemChecked: function (model) {
            if (model.get('checked')) {
                this.selectedItemsCollection.add(model);
            } else {
                this.selectedItemsCollection.remove(model);
            }
        },

        locate: function () {
            console.log(this.selectedItemsCollection)
        },

        render: function () {
            var self = this;

            this.$el.html(_.template(MainTemplate));
            this.renderDevices();
            return this;
        }
    });
    return MainView;
});