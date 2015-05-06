define([
    'text!templates/main/MainTemplate.html',
    'views/map/mapView',
    'views/map/markerView',
    'collections/devicesCollection',
    'views/device/deviceMainListView',
    'views/customElements/paginationView'
], function (MainTemplate, MapView, markerView, DevisesCollection, deviceMainListView, PaginationView) {

    var MainView = Backbone.View.extend({
        className: "mainPage",
        events: {
            'click #globalDevicesChecker': 'globalCheckTrigger',
            'click #mapLocateButton': 'locate',
            'submit #searchForm': 'search'
        },

        initialize: function () {
            var self = this;
            this.stateModel = new Backbone.Model({
                params: {}
            });

            this.selectedDevicesCollection = new DevisesCollection();
            this.curnetMarkersOnMap = [];
            this.views = [];

            this.render();

            this.devicesCoordinatesCollection = new DevisesCollection();

            this.devisesCollection = new DevisesCollection();

            this.listenTo(this.devisesCollection, 'sync remove', this.renderDevices);
            this.listenTo(this.devisesCollection, 'change', this.renderDevices);
            this.listenTo(this.stateModel, 'change:params', this.handleParams);

            this.devicesCoordinatesCollection.on('reset', function () {
                self.setMarkers()
            });

            this.paginationView = new PaginationView({
                collection: this.devisesCollection,
                onPage: 10,
                padding: 2,
                page: 1,
                ends: true,
                steps: true,
                url: 'main/page',
                data: {
                    status: 'subscribed'
                }
            });
            this.$el.find('#pagination').append(this.paginationView.$el);
        },

        afterUpend: function () {
            if (!App.map) {
                this.mapView = new MapView();
            }
            this.renderDevices();
        },

        search: function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.paginationView.setData({
                isPayed: true,
                enabledTrackLocation: true,
                name: this.$el.find('#search').val()
            });
        },


        renderDevices: function () {
            this.$el.find('#globalDevicesChecker').prop('checked', false);
            var self = this;
            var devicesList = this.$el.find('#devicesMainList');
            //devicesList.html('');
            _.each(this.views, function (view) {
                self.stopListening(view.stateModel);
                view.remove();
            });


            this.devisesCollection.map(function (device) {
                //var isSelected = false;

                var selectedDevice = self.selectedDevicesCollection.find(function (model) {
                    if (model.id === device.id) return true;
                });

                var view = new deviceMainListView({model: device});

                if (selectedDevice) {
                    view.stateModel.set({checked: true});
                }

                self.listenTo(view.stateModel, 'change', self.itemChecked);
                self.views.push(view);
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
            this.clearMarkers();
            var self = this;
            var devicesIdis = [];
            var data;

            this.selectedDevicesCollection.map(function (model) {
                devicesIdis.push(model.id);
            });

            if (devicesIdis.length === 0) {
                this.devicesCoordinatesCollection.reset();
                App.map.setZoom(1);
            } else {

                data = JSON.stringify({
                    devices: devicesIdis
                });
                $.ajax({
                    url: '/devices/getLocations',
                    type: "POST",
                    contentType: 'application/json',
                    data: data,
                    success: function (data) {
                        self.devicesCoordinatesCollection.reset(data);
                    },
                    error: function (err) {
                        App.error(err);
                    }
                });
            }
        },

        clearMarkers: function () {
            _.each(this.curnetMarkersOnMap, function (view) {
                view.removeMarker();
                view.remove();
            });
            this.curnetMarkersOnMap = [];
        },

        setMarkers: function () {
            var self = this;
            this.devicesCoordinatesCollection.map(function (model) {
                var view = new markerView({model: model});
                self.curnetMarkersOnMap.push(view);
            });
            if (this.curnetMarkersOnMap.length < 2) {
                if (this.curnetMarkersOnMap.length === 1) {
                    App.map.setZoom(11);
                    App.map.setCenter(this.curnetMarkersOnMap[0].marker.position);
                } else {
                    App.map.setZoom(1);
                }
            } else {
                var bounds = new google.maps.LatLngBounds();
                _.each(self.curnetMarkersOnMap, function (view) {
                    bounds.extend(view.marker.position);
                });
                App.map.fitBounds(bounds);
            }
        },


        render: function () {
            this.$el.html(_.template(MainTemplate));
            return this;
        },
        setParams: function (params) {
            this.stateModel.set({params: params});
        },
        handleParams: function () {
            var params = this.stateModel.get('params');
            if (params) {
                if (params.page) {
                    this.paginationView.stateModel.set({
                        page: this.stateModel.get('params').page
                    });
                }
            }
        }
    });
    return MainView;
});