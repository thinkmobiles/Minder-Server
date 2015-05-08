define([
    'text!templates/devices/devicesTemplate.html',
    'text!templates/devices/devicesModalTemplate.html',
    'collections/devicesCollection',
    'views/device/deviceMainListView',
    'views/customElements/paginationView',
    'constants/statuses'
], function (Template, ModalTemplate, DevisesCollection, deviceMainListView, PaginationView, STATUSES) {

    var View;
    View = Backbone.View.extend({
        isNew: true, // prevent query duplication

        events: {
            'click #globalDevicesChecker': 'globalCheckTrigger', // check all devices
            'submit #searchForm': 'search',
            'click .deviceCheckbox': 'deviceCheck', // check separate devices
            'click .setDelete': 'deviceDelete',
            'click .setActive': 'deviceActivate',
            'change #period': 'periodObserver' // period observer
        },

        initialize: function (options) {
            var self = this;
            var modal = false; // modal window status property
            var paginationOptions; // pagination settings

            if (options) {
                // set modal status
                modal = options.modal || false;
            }

            this.stateModel = new Backbone.Model({
                params: {}, // current view url params (page)
                devices: [], // devices array to render
                checked: false, // global checker status
                selectedDevicesCount: 0,
                newPlan: null, // user new plan by calculator
                costForThisMonth: 0, // render the cost
                modal: modal, // the view mode (modal or not, bool)
                period: 'month', // for subscription (for calculator),
                search: ''
            });


            this.devisesCollection = new DevisesCollection(); // current page devices

            this.selectedDevicesCollection = new DevisesCollection(); // all selected devices on all pages

            paginationOptions = {
                collection: this.devisesCollection,
                onPage: 10,
                padding: 2,
                page: 1,
                ends: true,
                steps: true,
                url: 'devices/page',
                urlPagination: true
            };

            // if the page is change fetch new models
            this.listenTo(this.stateModel, 'change:params', this.handleParams);

            // keep data actual
            this.listenTo(this.devisesCollection, 'sync remove', this.render);


            if (modal) {
                this.listenTo(this.selectedDevicesCollection, 'add remove', function () {
                    self.calculatePlan();
                    self.render();
                });
                App.sessionData.on('change:date change:tariffPlans sync', function () {
                    self.calculatePlan();
                });
                paginationOptions.urlPagination = false;
                this.listenTo(this.stateModel, 'change:period', function () {
                    this.calculatePlan();
                    this.render();
                });
                self.calculatePlan();
            }

            // create pagination to control devices collection
            this.paginationView = new PaginationView(paginationOptions);
        },

        // update period, keep actual
        periodObserver: function () {
            this.stateModel.set({
                period: this.$('#period').val()
            });
        },

        // select and unSelect devices
        // add / remove from selected devices collection
        deviceCheck: function (event) {
            var self = this;
            this.devisesCollection.map(function (model) {
                if (model.id === event.target.value) {
                    //console.log(event.toElement.checked);
                    if (event.toElement.checked) {
                        self.selectedDevicesCollection.add(model);
                    } else {
                        self.selectedDevicesCollection.remove(model);
                    }
                }
            });
        },

        // set device deleted
        deviceDelete: function (event) {
            console.log(STATUSES);
            this.devisesCollection.map(function (model) {
                if (model.id === event.target.value) {
                    model.save({
                        status: STATUSES.DELETED
                    }, {
                        patch: true
                    });
                }
            });
        },

        // set deleted device active again
        deviceActivate: function (event) {
            this.devisesCollection.map(function (model) {
                if (model.id === event.target.value) {
                    model.save({
                        status: STATUSES.ACTIVE
                    }, {
                        patch: true
                    });
                    console.log(model.toJSON())
                }
            });
        },

        // create devices array ro render
        // and check is selected or not
        updateDevicesData: function () {
            var self = this;
            var devices = [];
            var deviceSelected = null;
            this.devisesCollection.map(function (device) {
                deviceSelected = self.selectedDevicesCollection.find(function (devSelected) {
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

        // calculate plan for user to preview
        calculatePlan: function () {
            var self = this;
            var sessionData = App.sessionData.toJSON();
            var plans = sessionData.tariffPlans;
            var date = sessionData.date;
            if (!plans && !date) return;
            var user = sessionData.user;
            var period = this.stateModel.get('period');


            window.costCounter({
                date: date,
                plans: plans,
                user: user,
                period: period,
                selectedDevicesCount: this.selectedDevicesCollection.length
            }, function (err, result) {
                if (err) {
                    return App.error(err);
                }
                self.stateModel.set({
                    calculations: result
                });
            });
        },

        // set search filter for pagination
        search: function (event) {
            var search =  this.$el.find('#search').val().trim();
            event.preventDefault();
            this.stateModel.set({
                search:search
            });
            this.paginationView.setData({
                name: search
            });
        },

        // if not new view update devices (keep data actual)
        afterUpend: function () {
            if (this.isNew) {
                this.isNew = false;
                return
            }
            this.paginationView.refresh(); // refresh current page
            this.render();
        },

        // observes global checker and add or remove all
        // objects from page to checked collection
        globalCheckTrigger: function () {
            var checked = this.$el.find('#globalDevicesChecker').prop('checked');
            var checkedDevices = [];
            this.stateModel.set({checked: checked});
            if (checked) {
                checkedDevices = this.devisesCollection.filter(function (model) {
                    if (model.get('status') !== STATUSES.DELETED) {
                        return true
                    }
                });
                this.selectedDevicesCollection.add(checkedDevices);
            } else {
                this.selectedDevicesCollection.remove(this.devisesCollection.models);
            }
        },

        // set the page parameter for pagination
        setParams: function (params) {
            this.stateModel.set({params: params});
        },

        // set page if exist (wil fetch data)
        handleParams: function () {
            var params = this.stateModel.get('params');

            if (params) {
                if (params.page) {
                    this.paginationView.stateModel.set({
                        page: this.stateModel.get('params').page
                    });
                }
            }
        },

        render: function () {
            this.updateDevicesData();
            var data = this.stateModel.toJSON();

            // set template
            if (data.modal) {
                this.$el.html(_.template(ModalTemplate, data));
            } else {
                this.$el.html(_.template(Template, data));
            }

            this.$el.find('#pagination').append(this.paginationView.render().$el);

            return this;
        }

    });

    return View;
})
;