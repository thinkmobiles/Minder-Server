define([
    'text!templates/devices/devicesTemplate.html',
    'text!templates/devices/devicesModalTemplate.html',
    'collections/devicesCollection',
    'views/device/deviceMainListView',
    'views/customElements/paginationView',
    'constants/statuses',
    'views/geoFence/geoFenceView',
    'config/config',
    'stripeCheckout'
], function (
    Template,
    ModalTemplate,
    DevisesCollection,
    deviceMainListView,
    PaginationView,
    STATUSES,
    GeoFenceView,
    config,
    StripeCheckout)  {

    var View;
    View = Backbone.View.extend({


        isNew: true,

        events: {
            'keypress #search'                     : 'searchOnEnter',
            'click    #globalDevicesChecker'       : 'globalCheckTrigger',
            'change   #period'                     : 'periodObserver',
            'click    #buttonSubscribe'            : 'startSubscribe',
            'click    #saveAll'                    : 'saveAllButton',
            'click    .goSearch'                   : 'search',
            'click    .clearSearch'                : 'clearSearch',
            'click    .deviceCheckbox'             : 'deviceCheck',
            'click    .setDelete'                  : 'deviceDelete',
            'click    .setActive'                  : 'deviceActivate',
            'click    .setEdit'                    : 'testGeo',
            'click    .cancelEditDevice'           : 'closeDevicesView',
            'click    .customSelect .current'      : 'showPeriodList',
            'click    .customSelect .list .item'   : 'choosePeriodList'

        },

        initialize: function (options) {
            var self = this;
            var modal = false;
            var paginationOptions;
            var user = App.sessionData.get('user');

            if (options) {
                modal = options.modal || false;
            }

            this.stateModel = new Backbone.Model({
                params            : {},
                devices           : [],
                checked           : false,
                selectedDevicesCount: 0,
                newPlan           : null,
                costForThisMonth  : 0,
                modal             : modal,
                period            : user.billings.planPeriod || 'month',
                search            : ''
            });

            this.billingModel = new Backbone.Model({
                billingId : null,
                token     : null,
                status    : null
            });

            this.devisesCollection = new DevisesCollection();
            this.selectedDevicesCollection = new DevisesCollection();

            paginationOptions = {
                collection    : this.devisesCollection,
                onPage        : 10,
                padding       : 2,
                page          : 1,
                ends          : true,
                steps         : true,
                url           : 'devices/page',
                urlPagination : true
            };

            this.Stripe = StripeCheckout.configure({
                key       : config.stripePublicKey,
                image     : '/images/logoForPaiments.jpg',
                token     : function (token) {
                    self.stripeTokenHandler(token);
                },
                email     : App.sessionData.get('user').email,
                panelLabel: 'Subscribe'
            });

            this.listenTo(this.billingModel, 'change:token', this.subscribeHandler);
            this.listenTo(this.stateModel, 'change:params', this.handleParams);
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

            this.paginationView = new PaginationView(paginationOptions);
        },

        saveAllButton : function (){
            this.devicesView.saveDevice();
        },

        stripeTokenHandler: function (token) {
            this.billingModel.set({
                token: token
            });
        },

        startSubscribe : function () {
            var self = this;
            var status    = this.$el.find('#buttonSubscribe').attr('data-status');
            var currentId = this.$el.find('#modalEditGeoFenceContent>div').attr('id');
            var myModalWindow = this.$el.find('#editGeoFenceModal');

            if (status !== '2') {

                this.billingModel.set({billingId: currentId});

                myModalWindow.on('hidden.bs.modal', this.showStripe());
                myModalWindow.modal('hide');

                myModalWindow.off('hidden.bs.modal');
            } else {
                if (!confirm('This device is already subscribed ...')) {
                    return
                }
                $.ajax({
                    url         : '/devices/'+currentId+'/geoFence/unsubscribe',
                    method      : 'POST',
                    contentType : 'application/json',

                    success: function () {
                        self.$el.find('#buttonSubscribe').attr('data-status','1');
                        self.startSubscribe()
                    },
                    error: function (err) {
                        App.error(err);
                    }
                });
            }
        },

        subscribeHandler: function () {
            var self = this;
            var myId = this.billingModel.get('billingId');
            var myToken = this.billingModel.get('token');
            var data = {
                token : myToken
            };

            if (myToken) {
                $.ajax({
                    url        : '/devices/' + myId + '/geoFence/subscribe',
                    method     : 'POST',
                    contentType: 'application/json',
                    beforeSend : self.showWaiting(),
                    data       : JSON.stringify(data),

                    success: function () {
                        self.$el.find('#buttonSubscribe').attr('data-status','2');
                        self.billingModel.set({token: null});
                        self.hideWaiting();
                        alert('Success subscription');
                        self.$el.find('#editGeoFenceModal').modal('show');
                        App.updateUser();
                    },
                    error: function (err) {
                        self.hideWaiting();
                        App.error(err);
                        self.$el.find('#editGeoFenceModal').modal('show');
                    }
                });
            }
        },

        showWaiting: function(){
            this.$el.find('#waitingModal').modal('show');
        },

        hideWaiting: function(){
            this.$el.find('#waitingModal').modal('hide');
        },

        showPeriodList: function () {
            this.$el.find(".customSelect .list").toggle();
        },

        choosePeriodList: function (e) {
            var period = $(e.target).data("val");
            this.$el.find("customSelect .current .text").text($(e.target).text());
            this.$el.find(".customSelect .list").hide();
            this.stateModel.set({
                period: period
            });
        },

        searchOnEnter: function (event) {
            if (event.keyCode === 13) {
                this.search(event);
            }
        },

        periodObserver: function () {
            this.stateModel.set({
                period: this.$('#period').val()
            });
        },

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

        myChecked: function () {
            var leng = $('input.deviceCheckbox:checked').length;
            if (leng == this.devisesCollection.length) {
                $('#globalDevicesChecker').prop('checked', true);
            } else {
                $('#globalDevicesChecker').prop('checked', false);
            }
        },

        updateUserData: function () {
            $.ajax({
                url    : "/currentUser",
                type   : "GET",
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
                        device   : device.toJSON(),
                        selected : true
                    })
                } else {
                    devices.push({
                        device   : device.toJSON(),
                        selected : false
                    })
                }
            });

            var selectedDevicesCount = this.selectedDevicesCollection.length;
            this.stateModel.set({
                selectedDevicesCount : selectedDevicesCount,
                devices              : devices
            });
        },


        showStripe: function () {
            this.Stripe.open({
                name: 'Minder'
            });

            this.stateModel.set({
                token: null
            });
        },

        testGeo: function (e) {
            var geoModal = this.$el.find('#editGeoFenceModal');
            geoModal.find('#buttonSubscribe').attr('data-status','');

            if (geoModal.attr('aria-hidden') === 'false'){return}

            var target = $(e.target);
            var id = target.attr('value');
            var tabBody = this.$el.find('tbody');

            tabBody.find('.activeN').removeClass('activeN');
            target.parent().siblings('.nam').addClass('activeN');

            if (this.devicesView){
                this.devicesView.undelegateEvents();
            }

            this.devicesView = new GeoFenceView({id: id});
            this.$el.find('#modalEditGeoFenceContent').html(this.devicesView.el);

            geoModal.modal('show').css({
                width: "800px"
            });
        },

        closeDevicesView: function () {

            this.$el.find('#editDeviceModal').modal('hide');
            this.$el.find('#editGeoFenceModal').modal('hide');

            if (this.devicesView) {
                this.devicesView.undelegateEvents();
                this.devicesView.remove();
            }
        },

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

            var devices = _.map(selectedDevices, function (device) {
                return device.toJSON()
            });

            var counterParams = {
                user      : user,
                plans     : plans,
                now       : date,
                period    : period,
                devices   : devices
            };

            window.costCounter(counterParams, function (err, result) {
                if (err) {
                    return App.error(err);
                }
                self.stateModel.set({
                    calculations: result
                });
            });
        },

        search: function (event) {
            event.preventDefault();
            var search = this.$el.find('#search').val().trim();

            if (this.stateModel.get('modal')) {
                this.stateModel.set({
                    search: search
                });
                this.paginationView.setData({
                    name  : search,
                    status: [
                        STATUSES.ACTIVE,
                        STATUSES.SUBSCRIBED
                    ],
                    sort  : '-status billings.expirationDate name'
                });
            } else {

                this.stateModel.set({
                    search: search
                });
                this.paginationView.setData({
                    name  : search,
                    sort  : '-status billings.expirationDate name'
                });
            }
        },

        clearSearch: function (event) {
            this.$el.find('#search').val('');
            this.search(event);
        },

        afterUpend: function () {
            if (this.isNew) {
                this.isNew = false;
                return
            }
            this.paginationView.refresh();
            this.render();

        },

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

        getDateUntil: function (now, until) {
            var months = moment(until).diff(moment(now), 'months');

            now.setMonth(now.getMonth() + months);

            var weeks = moment(until).diff(now, 'weeks');

            now.setDate(now.getDate() + (7 * weeks));

            var days = moment(until).diff(now, 'days');

            return {    months : months,
                        weeks  : weeks,
                        days   : days
                   }
        },

        render: function () {

            this.updateDevicesData();

            var data = this.stateModel.toJSON();
            var now  = App.sessionData.get('date');
            var self = this;

            data.DEVICE_STATUSES = STATUSES;

            if (data.modal) {
                this.$el.html(_.template(ModalTemplate, data));
                this.myChecked();
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
