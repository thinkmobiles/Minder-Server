define([
    'text!templates/devices/devicesTemplate.html',
    'text!templates/devices/devicesModalTemplate.html',
    'collections/devicesCollection',
    'views/device/deviceMainListView',
    'views/customElements/paginationView',
    'constants/statuses',
    'views/device/deviceView'
], function (Template, ModalTemplate, DevisesCollection, deviceMainListView, PaginationView, STATUSES, deviceView) {

    var View;
    View = Backbone.View.extend({


        isNew: true, // prevent query duplication

        events: {
            'click #globalDevicesChecker' : 'globalCheckTrigger', // check all devices
            'click .goSearch'             : 'search',
            'keydown'                     : 'keydownHandler',
            'click .clearSearch'          : 'clearSearch',
            'click .deviceCheckbox'       : 'deviceCheck', // check separate devices
            'click .setDelete'            : 'deviceDelete',
            'click .setActive'            : 'deviceActivate',
            'click .setEdit'              : 'showEditDeviceModal',
            'click .cancelEditDevice'     : 'closeDevicesView',
            'change #period'              : 'periodObserver' // period observer
        },

        initialize: function (options) {
            var self = this;
            var modal = false; // modal window status property
            var paginationOptions; // pagination settings
            var user = App.sessionData.get('user');

            if (options) {
                // set modal status
                modal = options.modal || false;
            }

            this.stateModel = new Backbone.Model({
                params                : {},                  // current view url params (page)
                devices               : [],                  // devices array to render
                checked               : false,               // global checker status
                selectedDevicesCount  : 0,
                newPlan               : null,                // user new plan by calculator
                costForThisMonth      : 0,                   // render the cost
                modal                 : modal,               // the view mode (modal or not, bool)
                period                : user.billings.planPeriod || 'month', // for subscription (for calculator),
                search                : ''
            });

            this.devisesCollection = new DevisesCollection();         // current page devices

            this.selectedDevicesCollection = new DevisesCollection(); // all selected devices on all pages

            paginationOptions = {
                collection   : this.devisesCollection,
                onPage       : 10,
                padding      : 2,
                page         : 1,
                ends         : true,
                steps        : true,
                url          : 'devices/page',
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
                paginationOptions.data = {
                    status: [
                        STATUSES.ACTIVE,
                        STATUSES.SUBSCRIBED
                    ],
                    sort: '-status billings.expirationDate name'
                };

                this.listenTo(this.stateModel, 'change:period', function () {
                    this.calculatePlan();
                    this.render();
                });
                self.calculatePlan();
            } else {
                paginationOptions.data = {
                    sort: '-status billings.expirationDate name'
                };
            }

            // create pagination to control devices collection
            this.paginationView = new PaginationView(paginationOptions);
        },

        keydownHandler: function (event) {
            switch (event.which) {
                case 13:
                    this.search(event);
                    break;
                default:
                    break;
            }
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
                    if (event.currentTarget.checked) {
                        self.selectedDevicesCollection.add(model);
                    } else {
                        self.selectedDevicesCollection.remove(model);
                    }
                }
            });
        },

        updateUserData: function () {
            $.ajax({
                url : "/currentUser",
                type: "GET",
                success: function (data) {
                    App.sessionData.set({
                        user: data
                    })
                },
                error: function (data) {
                    App.error(data);
                }
            });
        },

        // set device deleted
        deviceDelete: function (event) {
            if (!confirm('Are you sure you want to delete this device?')) {
                return
            }
            var self = this;
            this.devisesCollection.map(function (model) {
                if (model.id === event.target.value) {
                    model.save({
                        status: STATUSES.DELETED
                    }, {
                        patch: true,
                        success: function () {
                            self.updateUserData();
                        }
                    });
                }
            });
        },

        // set deleted device active again
        deviceActivate: function (event) {
            var self = this;
            this.devisesCollection.map(function (model) {
                if (model.id === event.target.value) {
                    model.save({
                        status: STATUSES.ACTIVE
                    }, {
                        patch: true,
                        success: function () {
                            self.updateUserData();
                        }
                    });
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

        /*deviceEdit: function (e) {

            e.preventDefault();
            var id = $(e.target).attr('value');

            new deviceView({id : id});
        },
*/

        //==========================================\/\/\/\/\/\/\/\/

        // open the modal
        showEditDeviceModal: function (e) {

            var id = $(e.target).attr('value');

            this.$el.find('#editDeviceModal').modal({
                show: true,
                backdrop: 'static'
            });

            this.devicesView = new deviceView({id : id});

            this.$el.find('#modalEditContent').append(this.devicesView.el);

        },

        closeDevicesView: function () {
            // hide modal
            this.$el.find('#editDeviceModal').modal('hide');
            // remove devices view
            if (this.devicesView) {
                this.devicesView.undelegateEvents();
                this.devicesView.remove();
            }
        },


        //===========================================/\/\/\/\/\/\/\


        // calculate plan for user to preview
        calculatePlan: function () {
            var self = this;
            var sessionData = App.sessionData.toJSON();
            var plans = sessionData.tariffPlans;
            var date = sessionData.date;
            if (!plans && !date) return;
            var user = sessionData.user;
            var period = this.stateModel.get('period');
            var selectedDevices = this.selectedDevicesCollection.filter(function (device) {
                if (device.get('status') !== STATUSES.DELETED) return true
            });

            window.costCounter({
                date: date,
                plans: plans,
                user: user,
                period: period,
                selectedDevicesCount: selectedDevices.length
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
            event.preventDefault();
            var search = this.$el.find('#search').val().trim();

            if (this.stateModel.get('modal')) {
                this.stateModel.set({
                    search: search
                });
                this.paginationView.setData({
                    name: search,
                    status: [
                        STATUSES.ACTIVE,
                        STATUSES.SUBSCRIBED
                    ],
                    sort: '-status billings.expirationDate name'
                });
            } else {

                this.stateModel.set({
                    search: search
                });
                this.paginationView.setData({
                    name: search,
                    sort: '-status billings.expirationDate name'
                });
            }
        },

        clearSearch: function (event) {
            this.$el.find('#search').val('');
            this.search(event);
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

        // get delta date
        getDateUntil: function (now, until) {
            var months = moment(until).diff(moment(now), 'months');

            now.setMonth(now.getMonth() + months);

            var weeks = moment(until).diff(now, 'weeks');

            now.setDate(now.getDate() + (7 * weeks));

            var days = moment(until).diff(now, 'days');
            var result = {
                months: months,
                weeks: weeks,
                days: days
            };

            return result
        },

        render: function () {

            this.updateDevicesData();
            var data = this.stateModel.toJSON();
            var now = App.sessionData.get('date');
            var self = this;

            data.DEVICE_STATUSES = STATUSES;

            // set template
            if (data.modal) {
                this.$el.html(_.template(ModalTemplate, data));
            } else {
                _.each(data.devices, function (device) {
                    device.expirationDate = self.getDateUntil(new Date(now), device.device.billings.expirationDate); // format date (until style)
                });

                this.$el.html(_.template(Template, data));
            }

            this.$el.find('#pagination').append(this.paginationView.render().$el);

            return this;
        }

    });

    return View;
})
;