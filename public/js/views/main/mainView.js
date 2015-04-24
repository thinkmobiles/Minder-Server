define([
    'text!templates/main/MainTemplate.html',
    'views/map/mapView',
    'views/map/markerView',
    'collections/devicesCollection',
    'views/device/deviceMainListView',
    'views/customElements/paginationView'
], function (MainTemplate, MapView, markerView, DevisesCollection, deviceMainListView, PaginationView) {

    var MainView = Backbone.View.extend({
        //el: '#wrapper',
        events: {
            'click #globalDevicesChecker': 'globalCheckTrigger',
            'click #mapLocateButton': 'locate',
            'submit #searchForm': 'search'
        },

        initialize: function (options) {
            var _this = this;
            this.stateModel = new Backbone.Model({
                params: {}
            });

            this.selectedDevicesCollection = new DevisesCollection();
            this.curnetMarkersOnMap = [];
            this.views = [];


            this.render();


            this.devisesCollection = new DevisesCollection();

            this.listenTo(this.devisesCollection, 'sync remove', this.renderDevices);
            this.listenTo(this.devisesCollection, 'change', this.renderDevices);
            this.listenTo(this.stateModel, 'change:params', this.handleParams);

            this.selectedDevicesCollection.on('sync', function () {
                _this.setMarkers()
            });


            this.paginationView = new PaginationView({
                collection: this.devisesCollection,
                onPage: 10,
                padding: 2,
                page: 1,
                url: 'main/page',
                data: {
                    isPayed: true,
                    enabledTrackLocation: true
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
            console.log('search', this.$el.find('#search').val());
            this.paginationView.setData({
                isPayed: true,
                enabledTrackLocation: true,
                name: this.$el.find('#search').val()
            });
        },


        renderDevices: function () {
            this.$el.find('#globalDevicesChecker').prop('checked', false);
            var _this = this;
            var devicesList = this.$el.find('#devicesMainList');
            //devicesList.html('');
            _.each(this.views, function (view) {
                _this.stopListening(view.stateModel);
                view.remove();
            });


            this.devisesCollection.map(function (device) {
                //var isSelected = false;

                var selectedDevice = _this.selectedDevicesCollection.find(function (model) {
                    console.log('id', device.id);
                    if (model.id === device.id) return true;
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
                this.selectedDevicesCollection.add(this.devisesCollection.find(function (device) {
                    if (device.cid === model.get('deviceCid')) return true;
                }));
            } else {
                this.selectedDevicesCollection.remove(this.devisesCollection.find(function (device) {
                    if (device.cid === model.get('deviceCid')) return true;
                }));
            }
            console.log('selectedDevicesCollection', this.selectedDevicesCollection);
        },

        locate: function () {
            this.clearMarkers();
            var _this = this;
            var devicesIdis = [];


            this.selectedDevicesCollection.map(function (model) {
                devicesIdis.push(model.id);
            });

            if (devicesIdis.length === 0) {
                this.selectedDevicesCollection.reset();
                App.map.setZoom(1);
            } else {
                this.selectedDevicesCollection.fetch({
                    reset: true,
                    data: {
                        devices: devicesIdis
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
            console.log(this);

            var _this = this;
            this.selectedDevicesCollection.map(function (model) {
                var view = new markerView({model: model});
                _this.curnetMarkersOnMap.push(view);
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
                _.each(_this.curnetMarkersOnMap, function (view) {
                    bounds.extend(view.marker.position);
                });
                App.map.fitBounds(bounds);
            }
        },

        render: function () {
            var self = this;
            this.$el.html(_.template(MainTemplate));
            return this;
        },
        setParams: function (params) {
            this.stateModel.set({params: params});
        },
        handleParams: function () {
            //console.log('handleParams1', params);
            var params = this.stateModel.get('params');
            if (params) {
                //console.log('handleParams2', params);
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