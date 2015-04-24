define([
    'text!templates/devices/devicesTemplate.html',
    'collections/devicesCollection',
    'views/device/deviceMainListView',
    'views/customElements/paginationView'
], function (MainTemplate, DevisesCollection, deviceMainListView, PaginationView) {

    var MainView = Backbone.View.extend({
        events: {
            'click #globalDevicesChecker': 'globalCheckTrigger',
            'submit #searchForm': 'search',
            'click #proceedSubscription': 'proceedSubscription'
        },

        initialize: function (options) {
            var _this = this;
            this.stateModel = new Backbone.Model({
                params: {},
                checked: false,
                monthArray: [],
                yearArray: [],
                selectedDevicesCount: 0
            });

            $.ajax({
                url: '/now',
                type: "GET",
                dataType: 'json',
                success: function (data) {
                    _this.stateModel.set({
                        date: new Date(data.now)
                    });
                    _this.generateDropdown();
                },
                error: function (err) {
                    App.error(err);
                }
            });

            this.selectedDevicesCollection = new DevisesCollection();

            this.views = [];


            this.devisesCollection = new DevisesCollection();

            this.listenTo(this.devisesCollection, 'sync remove', this.renderDevices);
            this.listenTo(this.devisesCollection, 'change', this.renderDevices);
            this.listenTo(this.stateModel, 'change:params', this.handleParams);
            this.listenTo(this.stateModel, 'change', function () {
                _this.generateDropdown();
                _this.render();
            });
            this.listenTo(this.selectedDevicesCollection, 'remove add', function () {
                _this.updateSelectedDevices();
                _this.render();
            });
            this.selectedDevicesCollection.on('all', function (e) {
                console.log(e);
            });
            this.render();

            this.paginationView = new PaginationView({
                collection: this.devisesCollection,
                onPage: 10,
                padding: 2,
                page: 1,
                url: 'devices/page'
                //data: {
                //    isPayed: true,
                //    enabledTrackLocation: true
                //}
            });
            this.$el.find('#pagination').append(this.paginationView.$el);
        },
        updateSelectedDevices: function () {
            this.stateModel.set({
                selectedDevicesCount: this.selectedDevicesCollection.length
            });

        },

        generateDropdown: function () {
            if (!this.stateModel.get('date')) {
                return
            }
            var monthArray = [];
            var yearArray = [];
            var year = this.stateModel.get('date').getFullYear();
            for (var i = 0; i < 12; i++) {
                monthArray.push({
                    name: i,
                    value: i
                });
            }
            for (var i = year; i < year + 6; i++) {
                yearArray.push({
                    name: i,
                    value: i
                });
            }

            this.stateModel.set({
                yearArray: yearArray,
                monthArray: monthArray
            })


        },
        proceedSubscription: function () {
            this.$el.find('#myModal').modal({show: true});
        },

        search: function (event) {
            event.preventDefault();
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
                    if (model.id === device.id) return true;
                });

                var view = new deviceMainListView({
                    model: device,
                    detail: true,
                    edit: true,
                    del: true
                });

                if (selectedDevice) {
                    view.stateModel.set({checked: true});
                }

                //_this.listenTo(view.stateModel, 'change', _this.itemChecked);
                _this.views.push(view);
                devicesList.append(view.$el);
            });
        },

        afterUpend: function () {
            this.renderDevices();
        },

        globalCheckTrigger: function () {
            var checked = this.$el.find('#globalDevicesChecker').prop('checked');
            //_.each(this.views, function (view) {
            //    view.stateModel.set({checked: checked});
            //});

            if (checked) {
                this.selectedDevicesCollection.add(this.devisesCollection.models);
            } else {
                this.selectedDevicesCollection.remove(this.devisesCollection.models);
            }
            console.log(this.selectedDevicesCollection.toJSON());
            this.stateModel.set({checked: checked});
            //this.render();

        },

        //itemChecked: function (model) {
        //    if (model.get('checked')) {
        //        this.selectedDevicesCollection.add(this.devisesCollection.find(function (device) {
        //            if (device.cid === model.get('deviceCid')) return true;
        //        }));
        //    } else {
        //        this.selectedDevicesCollection.remove(this.devisesCollection.find(function (device) {
        //            if (device.cid === model.get('deviceCid')) return true;
        //        }));
        //    }
        //},

        render: function () {
            var self = this;
            this.$el.html(_.template(MainTemplate, this.stateModel.toJSON()));
            this.renderDevices();
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