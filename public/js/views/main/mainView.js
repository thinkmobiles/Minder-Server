define([
    'text!templates/main/MainTemplate.html',
    'views/map/mapView',
    'views/map/markerView',
    'collections/devicesCollection',
    'views/device/deviceMainListView',
    'views/customElements/paginationView'
], function (MainTemplate, MapView, markerView, DevisesCollection, deviceMainListView, PaginationView) {

    var MainView = Backbone.View.extend({
        el: '#wrapper',
        events: {
            'click #globalDevicesChecker': 'globalCheckTrigger',
            'click #mapLocateButton': 'locate',
            'submit #searchForm': 'search'
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
            this.selectedDevicesCollection = new Backbone.Collection();
            this.curnetMarkersOnMap = [];
            this.views = [];

            this.render();
            this.mapView = new MapView();
            this.PaginationView = new PaginationView();
            this.$el.find('#pagination').append(this.PaginationView.$el);

            App.map = this.mapView.map;
        },

        search: function () {
            console.log('search');
        },


        renderDevices: function () {
            var _this = this;
            var devicesList = this.$el.find('#devicesMainList');
            //devicesList.html('');
            _.each(this.views, function (view) {
                _this.stopListening(view.stateModel);
                view.remove();
            });

            this.devisesCollection.map(function (device) {
                var selected = false;
                var selectedDevice = _this.selectedDevicesCollection.find(function (model) {
                    if (model.cid === device.cid) return true;
                });

                var view = new deviceMainListView({model: device});

                if (selectedDevice) {
                    view.stateModel.set({checked: true});
                }

                _this.listenTo(view.stateModel, 'change', _this.itemChecked);
                _this.views.push(view);
                devicesList.append(view.$el);
            });
        },

        globalCheckTrigger: function () {
            var checked = this.$el.find('#globalDevicesChecker').prop('checked');
            _.each(this.views, function (view) {
                view.stateModel.set({checked: checked});
            });

        },
        itemChecked: function (model) {
            if (model.get('checked')) {
                console.log('>>>==', model);
                this.selectedDevicesCollection.add(this.devisesCollection.find(function (device) {
                    if (device.cid === model.get('deviceCid')) return true;
                }));
            } else {
                this.selectedDevicesCollection.remove(this.devisesCollection.find(function (device) {
                    if (device.cid === model.get('deviceCid')) return true;
                }));
            }
        },

        locate: function () {
            var _this = this;
            _.each(this.curnetMarkersOnMap, function (view) {
                view.removeMarker();
                view.remove();
            });
            this.curnetMarkersOnMap = [];
            this.selectedDevicesCollection.map(function (model) {
                var view = new markerView({model: model});
                _this.curnetMarkersOnMap.push(view);
            });


            if (this.curnetMarkersOnMap.length < 2) {
                console.log('>>>>>>>>>>', this.curnetMarkersOnMap.length);
                if (this.curnetMarkersOnMap.length === 1) {
                    console.log('>>>>>___1');
                    App.map.setZoom(11);
                    App.map.setCenter(this.curnetMarkersOnMap[0].marker.position);
                } else {
                    console.log('>>>>>___0');
                    App.map.setZoom(1);
                }
            } else {
                console.log('>>>>>___> ');
                var bounds = new google.maps.LatLngBounds();
                _.each(_this.curnetMarkersOnMap, function (view) {
                    bounds.extend(view.marker.position);
                });
                App.map.fitBounds(bounds);
            }

            console.log(this.selectedDevicesCollection);
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