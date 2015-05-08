define([
    'text!templates/billingInfo/billingInfoTemplate.html',
    'collections/tariffPlansCollection',
    'config/config',
    'stripeCheckout',
    'views/devices/devicesView'
], function (template, TariffPlansCollection, config, StripeCheckout, DevicesView) {

    var View;
    View = Backbone.View.extend({
        initialize: function () {
            var self = this;
            this.collection = new TariffPlansCollection();

            this.stateModel = new Backbone.Model({
                renewal: App.sessionData.get('user').billings.renewEnabled,
                userPlan: null,
                action: null,
                token: null
            });

            ///////// update user plan and renewal

            App.sessionData.on('change:user', function () {
                if (App.sessionData.get('user')) {
                    self.setUserPlans();
                    self.render();
                    self.stateModel.set({
                        renewal: App.sessionData.get('user').billings.renewEnabled
                    });
                }
            });

            //////// create stripe handler

            this.Stripe = StripeCheckout.configure({
                key: config.strypePublicKay,
                image: '/images/logoForPaiments.jpg',
                token: function (token) {
                    self.stripeTokenHandler(token); ////// singe!!! coll when token is generated ... for all actions!
                },
                email: App.sessionData.get('user').email,
                panelLabel: 'Subscribe'
            });

            this.setUserPlans();
            this.render();
            this.listenTo(this.collection, 'reset', function () {
                self.setUserPlans(); // find and set user plan
                self.render();// render tariff plans when get from server
            });
            //this.listenTo(App.sessionData, 'change:tariffPlans', ); // set1
        },

        events: {
            'click #saveRenewal': "renewal",
            'click #showProceedSubscription': "showProceedSubscriptionModal",
            'click .cancelSubscription': "cancelProceedSubscriptionModal",
            'click #confirmSubscription': "confirmProceedSubscriptionModal",
            'click #confirmUnSubscribe': "confirmUnSubscribeModal"
        },

        updateData: function () {  //update user data when subscription is change
            $.ajax({
                url: "/currentUser",
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

        setUserPlans: function () { // find and set user plan
            var userPlan;
            var plans = App.sessionData.get('tariffPlans');
            if (!plans) {
                return
            }

            this.collection.reset(plans);

            userPlan = this.collection.find(function (model) {
                if (model.get('_id') === App.sessionData.get('user').currentPlan) {
                    return true;
                }
            });
            if (userPlan) {
                this.stateModel.set({
                    userPlan: userPlan.toJSON()
                });
            }
        },

        //start////// STRIPE //////// STRIPE //////// STRIPE //////// STRIPE

        showStripe: function () { // show stripe vindow
            this.Stripe.open({
                name: 'Minder'
            });

            this.stateModel.set({
                token: null
            });
        },

        stripeTokenHandler: function (token) {  // handel token and start an action by type
            this.stateModel.set({
                token: token
            });

            var action = this.stateModel.get('action');
            if (action) {
                switch (action.name) {
                    case "subscribe":
                        this.subscribeHandler();
                        break;
                    case "renewal":
                        this.renewalHandler();
                        break;
                }
            }
        },

        //end////// STRIPE //////// STRIPE //////// STRIPE //////// STRIPE

        //start////// RENEWAL //////// RENEWAL //////// RENEWAL ////////

        renewal: function () {
            var checked = this.$el.find('#renewal').prop('checked');
            var user = App.sessionData.get('user');
            user.billings.renewEnabled = checked;
            App.sessionData.set({
                user: user
            });

            this.stateModel.set({
                checked: checked,
                action: {
                    name: 'renewal'
                }
            });

            if (checked) {
                this.showStripe();
            } else {
                this.renewalHandler();
            }
        },

        renewalHandler: function () {
            var self = this;
            var data = {};
            data.token = this.stateModel.get('token');
            data.renewal = this.stateModel.get('renewal');
            $.ajax({
                url: '/renewal',
                contentType: 'application/json',
                data: JSON.stringify(data),
                method: 'POST',
                success: function () {
                    self.stateModel.set({
                        token: null,
                        action: null
                    });
                },
                error: function (err) {
                    App.error(err)
                }
            });
        },

        //end////// RENEWAL //////// RENEWAL //////// RENEWAL ////////

        //start////// SUBSCRIPTION MODAL //////// SUBSCRIPTION MODAL //////// SUBSCRIPTION MODAL

        onModalHide: function (cb) {
            this.$el.find('#proceedSubscriptionModal').on('hidden.bs.modal', function () {
                console.log('proceedSubscriptionModal CB');
                cb();
            });
        },

        closeDevicesView: function () {
            this.$el.find('#proceedSubscriptionModal').modal('hide');
            if (this.devicesView) {
                this.devicesView.undelegateEvents();
                this.devicesView.remove();
            }
        },

        showProceedSubscriptionModal: function () {
            this.closeDevicesView();

            this.$el.find('#proceedSubscriptionModal').off('hidden.bs.modal');

            this.$el.find('#proceedSubscriptionModal').modal({
                show: true,
                backdrop: 'static'
            });

            this.devicesView = new DevicesView({modal: true});
            this.$el.find('#modalContent').append(this.devicesView.el);

        },

        cancelProceedSubscriptionModal: function () {
            this.closeDevicesView();
        },

        confirmProceedSubscriptionModal: function () { // set action and data for it
            var self = this;
            var deviceIds = this.devicesView.selectedDevicesCollection.pluck('_id');
            var period = this.devicesView.stateModel.get('period');
            this.stateModel.set({
                action: {
                    name: 'subscribe',
                    data: {
                        deviceIds: deviceIds,
                        period: period
                    }
                }
            });

            this.closeDevicesView();
            this.onModalHide(function () {
                self.showStripe();
            });
        },

        confirmUnSubscribeModal: function () { // set action and data for it
            var deviceIds = this.devicesView.selectedDevicesCollection.pluck('_id');

            this.stateModel.set({
                action: {
                    name: 'unSubscribe',
                    data: {
                        deviceIds: deviceIds
                    }
                }
            });

            this.closeDevicesView();
            this.unSubscribeHandler();
        },

        subscribeHandler: function () { // handel action
            var self = this;
            var stateModel = this.stateModel.toJSON();
            var data = {
                deviceIds: stateModel.action.data.deviceIds,
                token: stateModel.token,
                period: stateModel.action.data.period
            };

            $.ajax({
                url: '/devices/subscribe',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: function () {
                    self.stateModel.set({
                        token: null,
                        action: null
                    });
                },
                error: function (err) {
                    App.error(err);
                }
            });
        },

        unSubscribeHandler: function () { // handel action
            var self = this;
            var stateModel = this.stateModel.toJSON();
            var data = {
                deviceIds: stateModel.action.data.deviceIds
            };

            $.ajax({
                data: JSON.stringify(data),
                method: 'POST',
                contentType: 'application/json',
                url: '/devices/unsubscribe',
                success: function () {
                    self.stateModel.set({
                        token: null,
                        action: null
                    });
                },
                error: function (err) {
                    App.error(err);
                }
            });
        },

        //end////// SUBSCRIPTION MODAL //////// SUBSCRIPTION MODAL //////// SUBSCRIPTION MODAL

        render: function () { // render the page
            var self = this;
            var data = this.stateModel.toJSON();
            var tearsYear;
            var tearsMonth;

            tearsMonth = new TariffPlansCollection(self.collection.filter(function (tier) {
                if (tier.get('metadata').type === 'month') {
                    return true
                }
            }));

            tearsYear = new TariffPlansCollection(self.collection.filter(function (tier) {
                if (tier.get('metadata').type === 'year') {
                    return true
                }
            }));

            data = _.extend(data, {
                tearsMonth: tearsMonth.toJSON(),
                tearsYear: tearsYear.toJSON(),
                user: App.sessionData.get('user')
            });

            data.tearsMonth = _.sortBy(data.tearsMonth, function (elem) {
                return elem.amount;
            });
            data.tearsYear = _.sortBy(data.tearsYear, function (elem) {
                return elem.amount;
            });

            this.$el.html(_.template(template, data));
            return this;
        }
    });

    return View;

});
