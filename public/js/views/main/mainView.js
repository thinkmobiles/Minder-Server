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
            'click #globalDevicesChecker': 'globalCheckTrigger', // check unCheck all devices on page
            'click #mapLocateButton': 'locate', // show markers on page
            'submit #searchForm': 'search' // set search filter
        },

        initialize: function () {
            var self = this;

            // checked devices collection
            this.selectedDevicesCollection = new DevisesCollection();

            // array of marker views
            this.curnetMarkersOnMap = [];

            // array of devices views
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
                onPage: 8, // devices on page
                padding: 2, // 2 after current pge 2 before
                page: 1, // default page
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

        // normalize map (if the size of page is changed)
        afterUpend: function () {
            var center;

            // if map not exist create it
            if (App.map) {
                center = App.map.getCenter();
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
            var self = this;
            var devicesList = this.$el.find('#devicesMainList');

            // unCheck the global checker
            this.$el.find('#globalDevicesChecker').prop('checked', false);

            // remove the old views
            _.each(this.views, function (view) {
                self.stopListening(view.stateModel);
                view.remove();
            });

            // set new views
            this.devisesCollection.map(function (device) {
                var selectedDevice;
                var view;

                // check if this device is checked
                selectedDevice = self.selectedDevicesCollection.find(function (model) {
                    if (model.id === device.id) return true;
                });

                view = new deviceMainListView({
                    model: device
                });

                // set checked if need
                if (selectedDevice) {
                    view.stateModel.set({
                        checked: true
                    });
                }

                // keep checked devices collection actual (check unCheck)
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
                // if no devices to show - show all msp
                this.devicesCoordinatesCollection.reset();
                App.map.setZoom(1);
            } else {
                // get devices coordinates
                data = JSON.stringify({
                    deviceIds: deviceIds
                });

                $.ajax({
                    url: '/devices/getLocations',
                    type: "POST",
                    contentType: 'application/json',
                    data: data,
                    success: function (data) {
                        // reset the collection and trigger marker views creation function
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
                    // show current marker and set zoom ... center on it ...
                    App.map.setZoom(11);
                    App.map.setCenter(this.curnetMarkersOnMap[0].marker.position);
                } else {
                    App.map.setZoom(1);
                }
            } else {
                // show all markers and set auto zoom and auto center
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