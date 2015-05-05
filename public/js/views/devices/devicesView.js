define([
    'text!templates/devices/devicesTemplate.html',
    'collections/devicesCollection',
    'views/device/deviceMainListView',
    'views/customElements/paginationView',
    'stripeCheckout',
    'config/config'
], function (MainTemplate, DevisesCollection, deviceMainListView, PaginationView, StripeCheckout, config) {

    var MainView = Backbone.View.extend({
            events: {
                'click #globalDevicesChecker': 'globalCheckTrigger',
                'submit #searchForm': 'search',
                'click #proceedSubscription': 'proceedSubscription',
                'click .deviceCheckbox': 'deviceCheck',
                'click .setDelete': 'deviceDelete',
                'click .setActive': 'deviceActivate',
                'click .unsubscribe': 'unsubscribe'
            },

            initialize: function (options) {
                var self = this;
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

                //this.Stripe = StripeCheckout.configure({
                //    key: config.strypePublicKay,
                //    image: '/images/logoForPaiments.jpg',
                //    token: function (token) {
                //        self.stripeTokenHandler(token);
                //    },
                //    //currency:'USD',
                //    email: App.sessionData.get('user').email,
                //    panelLabel: 'Subscribe'
                //});


                this.devisesCollection = new DevisesCollection();
                this.listenTo(this.stateModel, 'change:params', this.handleParams);
                this.listenTo(this.devisesCollection, 'sync remove', this.render);
                this.listenTo(this.selectedDevicesCollection, 'add remove', function () {
                    self.calculatePlan();
                    self.render();
                });
                this.selectedDevicesCollection.on('all', function (e) {
                    console.log('>>', e, self.selectedDevicesCollection.length);
                });
                App.sessionData.on('change:date change:tariffPlans sync', function () {
                    if (App.sessionData.get('date')) {
                        self.generateDropdown();
                    }
                    self.calculatePlan();
                });
                self.generateDropdown();
                self.calculatePlan();

                this.paginationView = new PaginationView({
                    collection: this.devisesCollection,
                    onPage: 10,
                    padding: 2,
                    page: 1,
                    ends: true,
                    steps: true,
                    url: 'devices/page'
                });
                this.render();

            },
            //stripeTokenHandler: function (token) {
            //    var self = this;
            //    var Model;
            //    var model;
            //    var devices = self.selectedDevicesCollection.toJSON();
            //    console.log(self);
            //    console.log(token);
            //    devices = _.pluck(devices, '_id');
            //
            //
            //    Model = Backbone.Model.extend({
            //        url: function () {
            //            return '/tariffPlans/subscribe'
            //        }
            //    });
            //    model = new Model();
            //    console.log({
            //        devices: devices,
            //        tokenObject: token
            //    });
            //    model.save({
            //        devices: devices,
            //        tokenObject: token
            //    }, {
            //        error: function (err) {
            //            App.error(err);
            //        },
            //        patch: true
            //    });
            //},
            //showStripe: function (e) {
            //    //e.preventDefault();
            //    this.Stripe.open({
            //        name: 'Demo Site',
            //        description: '2 widgets'
            //        //amount: 2500
            //    });
            //},
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
            deviceDelete: function (event) {
                this.devisesCollection.map(function (model) {
                    if (model.id === event.target.value) {
                        model.save({
                            status: 'deleted'
                        }, {
                            patch: true
                        });
                    }
                });
            },
            deviceActivate: function (event) {
                this.devisesCollection.map(function (model) {
                    if (model.id === event.target.value) {
                        model.save({
                            status: 'active'
                        }, {
                            patch: true
                        });
                        console.log(model.toJSON())
                    }
                });
            },
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
            calculatePlan: function () {
                var plans = App.sessionData.get('tariffPlans');
                var date = App.sessionData.get('date');
                if (!plans && !date) return;
                var user = App.sessionData.get('user');
                var plan;


                var result = window.costCounter({
                    date: date,
                    plans: plans,
                    user: user,
                    //plan:plan,
                    selectedDevicesCount: this.selectedDevicesCollection.length
                });

                this.stateModel.set({
                    calculations: result
                });
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
                this.$el.find('#warningModal').modal({show: true});
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

                $('#warningModal').on('hidden.bs.modal', function () {
                    Backbone.history.navigate('#billingInfo/subscribe',{
                        trigger:true
                    });
                });

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
            },
            unsubscribe: function () {
                var self = this;
                var selectedDevicesCollection = this.selectedDevicesCollection.pluck('_id');
                $.ajax({
                    data: {
                        devices: JSON.stringify(selectedDevicesCollection)
                    },
                    method: 'POST',
                    url: '/devices/unsubscribe',
                    success: function () {
                        self.selectedDevicesCollection.reset();
                        self.setParams({
                            page:1
                        })
                    },
                    error: function (err) {
                        App.error(err);
                    }
                });

            }
        })
        ;
    return MainView;
})
;