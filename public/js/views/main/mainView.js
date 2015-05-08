define([
    'text!templates/main/MainTemplate.html',
    'views/map/mapView',
    'views/map/markerView',
    'collections/devicesCollection',
    'views/device/deviceMainListView',
    'views/customElements/paginationView',
    'constants/statuses'
], function (MainTemplate, MapView, markerView, DevisesCollection, deviceMainListView, PaginationView, STATUSES) {

    var View;
    View = Backbone.View.extend({
        className: "mainPage",
        isNew: true,
        events: {
            'click #globalDevicesChecker': 'globalCheckTrigger',
            'click #mapLocateButton': 'locate',
            'submit #searchForm': 'search'
        },

        initialize: function () {
            var self = this;

            this.selectedDevicesCollection = new DevisesCollection();
            this.curnetMarkersOnMap = [];
            this.views = [];
            this.stateModel = new Backbone.Model({
                params: {} // for page param
            });


            this.devicesCoordinatesCollection = new DevisesCollection();
            this.devisesCollection = new DevisesCollection();

            // keep data actual
            this.listenTo(this.devisesCollection, 'sync remove', this.renderDevices);

            // change page ....
            this.listenTo(this.stateModel, 'change:params', this.handleParams);

            // set markers on map from data
            this.devicesCoordinatesCollection.on('reset', function () {
                self.setMarkers()
            });

            // set pagination to control devices collection
            this.paginationView = new PaginationView({
                collection: this.devisesCollection,
                onPage: 7,
                padding: 2,
                page: 1,
                ends: true,
                steps: true,
                data: {
                    status: STATUSES.SUBSCRIBED
                }
            });

            this.render();

            // append pagination to page
            this.$el.find('#pagination').append(this.paginationView.$el);
        },

        afterUpend: function () {
            // create map if not exist
            // if exist normalize it size....

            if (App.map) {
                var center = App.map.getCenter();
                google.maps.event.trigger(App.map, "resize");
                App.map.setCenter(center);
            } else {
                this.mapView = new MapView();
            }

            if (this.isNew) {
                this.isNew = false;
                return
            }

            this.paginationView.refresh();
        },

        search: function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();

            // set filter on pagination ... (for fetch query)
            this.paginationView.setData({
                status: STATUSES.SUBSCRIBED,
                name: this.$el.find('#search').val().trim()
            });
        },

        // render devices views
        renderDevices: function () {
            this.$el.find('#globalDevicesChecker').prop('checked', false);
            var self = this;
            var devicesList = this.$el.find('#devicesMainList');

            _.each(this.views, function (view) {
                self.stopListening(view.stateModel);
                view.remove();
            });

            this.devisesCollection.map(function (device) {
                var selectedDevice;
                var view;

                selectedDevice = self.selectedDevicesCollection.find(function (model) {
                    if (model.id === device.id) return true;
                });

                view = new deviceMainListView({
                    model: device
                });

                if (selectedDevice) {
                    view.stateModel.set({
                        checked: true
                    });
                }

                // keep checked devices collection actual
                self.listenTo(view.stateModel, 'change', self.itemChecked);

                self.views.push(view);
                devicesList.append(view.$el);
            });
        },

        // check unCheck all devices on current page
        globalCheckTrigger: function () {
            var checked = this.$el.find('#globalDevicesChecker').prop('checked');
            _.each(this.views, function (view) {
                view.stateModel.set({checked: checked});
            });
        },

        // observe checked items on page and add/remove from checked collection
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

        // get devices positions
        locate: function () {
            var self = this;
            this.clearMarkers(); // remove old markers
            var deviceIds = [];
            var data;

            this.selectedDevicesCollection.map(function (model) {
                deviceIds.push(model.id);
            });

            if (deviceIds.length === 0) {
                this.devicesCoordinatesCollection.reset();
                App.map.setZoom(1);
            } else {

                data = JSON.stringify({
                    deviceIds: deviceIds
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

        // remove old markers from map
        clearMarkers: function () {
            _.each(this.curnetMarkersOnMap, function (view) {
                view.removeMarker();
                view.remove();
            });
            this.curnetMarkersOnMap = [];
        },

        // set new markers on map
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

        // render template (once! because google maps)
        render: function () {
            this.$el.html(_.template(MainTemplate));
            return this;
        },

        // set current page
        setParams: function (params) {
            this.stateModel.set({params: params});
        },

        // set current page if is exist
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
    return View;
});