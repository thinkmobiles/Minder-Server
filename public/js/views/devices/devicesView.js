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
            'click #proceedSubscription': 'proceedSubscription',
            'click .deviceCheckbox': 'deviceCheck',
            'click .delete': 'deviceDelete'
        },

        initialize: function (options) {
            var _this = this;
            this.stateModel = new Backbone.Model({
                params: {},
                devices: [],
                checked: false,
                monthArray: [],
                yearArray: [],
                selectedDevicesCount: 0,
                currentPlan: null,
                newPlan: null,
                costForThisMonth: 0
            });


            this.selectedDevicesCollection = new DevisesCollection();
            this.devisesCollection = new DevisesCollection();
            this.listenTo(this.stateModel, 'change:params', this.handleParams);
            this.listenTo(this.devisesCollection, 'sync remove', this.render);
            this.listenTo(this.selectedDevicesCollection, 'add remove', function () {
                _this.calculatePlan();
                _this.render();
            });
            this.selectedDevicesCollection.on('all', function (e) {
                console.log('>>', e, _this.selectedDevicesCollection.length);
            });
            App.sessionData.on('change:date change:tariffPlans sync', function () {
                if (App.sessionData.get('date')) {
                    _this.generateDropdown();
                }
                _this.calculatePlan();
            });
            _this.generateDropdown();
            _this.calculatePlan();

            this.paginationView = new PaginationView({
                collection: this.devisesCollection,
                onPage: 10,
                padding: 2,
                page: 1,
                url: 'devices/page'
            });
            this.render();

        },
        deviceCheck: function (event) {
            var _this = this;
            this.devisesCollection.map(function (model) {
                if (model.id === event.target.value) {
                    //console.log(event.toElement.checked);
                    if (event.toElement.checked) {
                        _this.selectedDevicesCollection.add(model);
                    } else {
                        _this.selectedDevicesCollection.remove(model);
                    }
                }
            });
        },
        deviceDelete: function (event) {
            this.devisesCollection.map(function (model) {
                if (model.id === event.target.value) {
                    model.destroy();
                }
            });
        },
        updateDevicesData: function () {
            var _this = this;
            var selectedDevices = this.$el.find();
            var devices = [];
            var deviceSelected = null;
            this.devisesCollection.map(function (device) {
                deviceSelected = _this.selectedDevicesCollection.find(function (devSelected) {
                    if (devSelected.id === device.id) return true;
                });
                if (deviceSelected) {
                    devices.push({
                        device: device.toJSON(),
                        selected: true
                    })
                } else {
                    devices.push({
                        device: device.toJSON(),
                        selected: false
                    })
                }
            });

            var selectedDevicesCount = this.selectedDevicesCollection.length;
            this.stateModel.set({
                selectedDevicesCount: selectedDevicesCount,
                devices: devices
            });
        },
        calculatePlan: function () {
            var plans = App.sessionData.get('tariffPlans');
            var date = App.sessionData.get('date');
            if (!plans && !date) return;
            var user = App.sessionData.get('user');

            var result = window.costCounter({
                date:date,
                plans: plans,
                user: user,
                selectedDevicesCount: this.selectedDevicesCollection.length
            });

            this.stateModel.set({
                calculations: result
            });
            console.log('calkulation!', result);
        },
        generateDropdown: function () {
            var date = App.sessionData.get('date');
            if (!date) return;
            var monthArray = [];
            var yearArray = [];
            var year = date.getFullYear();
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
        afterUpend: function () {
            this.render();
        },
        globalCheckTrigger: function () {
            var checked = this.$el.find('#globalDevicesChecker').prop('checked');
            this.stateModel.set({checked: checked});
            if (checked) {
                this.selectedDevicesCollection.add(this.devisesCollection.models);
            } else {
                this.selectedDevicesCollection.remove(this.devisesCollection.models);
            }
        },
        render: function () {
            var self = this;
            this.updateDevicesData();
            this.$el.html(_.template(MainTemplate, this.stateModel.toJSON()));
            this.$el.find('#pagination').append(this.paginationView.$el);
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