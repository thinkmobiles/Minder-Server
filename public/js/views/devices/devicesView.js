define([
    'text!templates/devices/devicesTemplate.html',
    'collections/devicesCollection',
    'views/device/deviceMainListView',
    'views/customElements/paginationView'
], function (MainTemplate, DevisesCollection, deviceMainListView, PaginationView) {

    var MainView = Backbone.View.extend({
        events: {
            'click #globalDevicesChecker': 'globalCheckTrigger',
            'submit #searchForm': 'search'
        },

        initialize: function (options) {
            var _this = this;
            this.stateModel = new Backbone.Model({
                params: {}
            });

            this.selectedDevicesCollection = new DevisesCollection();

            this.views = [];


            this.render();


            this.devisesCollection = new DevisesCollection();

            this.listenTo(this.devisesCollection, 'sync', this.renderDevices);
            this.listenTo(this.devisesCollection, 'change', this.renderDevices);
            this.listenTo(this.stateModel, 'change:params', this.handleParams);

            this.selectedDevicesCollection.on('all', function (func) {
                console.log('>>>', func);
            });

            this.paginationView = new PaginationView({
                collection: this.devisesCollection,
                onPage: 10,
                padding: 2,
                page: 1,
                url: 'devices/page',
                //data: {
                //    isPayed: true,
                //    enabledTrackLocation: true
                //}
            });
            this.$el.find('#pagination').append(this.paginationView.$el);
        },

        search: function (event) {
            event.preventDefault();
            console.log('search', this.$el.find('#search').val());
            this.paginationView.setData({
                name: this.$el.find('#search').val()
            });
        },


        renderDevices: function () {
            this.$el.find('#globalDevicesChecker').prop('checked', false);
            var _this = this;
            var devicesList = this.$el.find('#devicesList');
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

                console.log('selectedDevice', selectedDevice);

                var view = new deviceMainListView({
                    model: device,
                    detail: true
                });

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