define([
    'text!templates/billingInfo/billingInfoTemplate.html',
    'collections/tariffPlansCollection',
    'config/config',
    'stripeCheckout',
    'views/devices/devicesView',
    'constants/statuses'
], function (
     template,
     TariffPlansCollection,
     config,
     StripeCheckout,
     DevicesView,
     STATUSES)    {

    var View;
    View = Backbone.View.extend({
        initialize: function () {
            var self = this;
            this.collection = new TariffPlansCollection();
            this.stateModel = new Backbone.Model({
                renewal  : App.sessionData.get('user').billings.renewEnabled,
                userPlan : null,
                action   : null,
                token    : null
            });

            App.sessionData.on('change:user change:tariffPlans', function () {
                if (App.sessionData.get('user')) {
                    self.setUserPlans();
                    self.render();
                    self.stateModel.set({
                        renewal: App.sessionData.get('user').billings.renewEnabled
                    });
                }
            });

            this.Stripe = StripeCheckout.configure({
                key        : config.stripePublicKey,
                image      : '/images/logoForPaiments.jpg',
                token      : function (token) {
                    self.stripeTokenHandler(token);
                },
                email      : App.sessionData.get('user').email,
                panelLabel : 'Subscribe'
            });

            this.setUserPlans();
            this.render();
        },

        events: {
            'click #saveRenewal'              : "renewal",
            'click #showProceedSubscription'  : "showProceedSubscriptionModal",
            'click .cancelSubscription'       : "cancelProceedSubscriptionModal",
            'click #confirmSubscription'      : "confirmProceedSubscriptionModal",
            'click #confirmUnSubscribe'       : "confirmUnSubscribeModal"
        },

        setUserPlans: function () {
            var userPlan;
            var plans = App.sessionData.get('tariffPlans');
            if (!plans) {
                return
            }

            this.collection.reset(plans);

            userPlan = this.collection.find(function (model) {
                if (model.get('_id') === App.sessionData.get('user').billings.currentPlan) {
                    return true;
                }
            });
            if (userPlan) {
                this.stateModel.set({
                    userPlan: userPlan.toJSON()
                });
            }
        },

        showStripe: function () {
            this.Stripe.open({
                name: 'Minder'
            });

            this.stateModel.set({
                token: null
            });
        },

        stripeTokenHandler: function (token) {
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

        renewal: function () {
            var checked = this.$el.find('#renewal').prop('checked');
            var user = App.sessionData.get('user');
            user.billings.renewEnabled = checked;
            App.sessionData.set({
                user: user
            });

            this.stateModel.set({
                renewal: checked,
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
            data.renewal = this.stateModel.get('renewal');
            if (data.renewal) {
                data.token = this.stateModel.get('token');
            }
            $.ajax({
                url         : '/renewal',
                contentType : 'application/json',
                data        : JSON.stringify(data),
                method      : 'PUT',
                beforeSend  : self.showWaiting(),

                success: function () {
                    self.stateModel.set({
                        token  : null,
                        action : null
                    });
                    self.hideWaiting();
                    alert('Updated successful!');
                    App.updateUser();
                },
                error: function (err) {
                    self.hideWaiting();
                    App.error(err)
                }
            });
        },

        onModalHide: function (cb) {
            this.$el.find('#proceedSubscriptionModal').on('hidden.bs.modal', function () {
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
            var myModal = this.$el.find('#proceedSubscriptionModal');
            if (myModal.attr('aria-hidden') === 'false' ) {return}

            this.closeDevicesView();

            myModal.off('hidden.bs.modal');

            myModal.modal({
                show     : true,
                backdrop : 'static'
            });

            this.devicesView = new DevicesView({modal: true});
            this.$el.find('#modalContent').append(this.devicesView.el);

        },

        cancelProceedSubscriptionModal: function () {
            this.closeDevicesView();
        },

        confirmProceedSubscriptionModal: function () {
            var self = this;
            var devicesToSubscribe;
            var deviceIds;
            var period = this.devicesView.stateModel.get('period');

            devicesToSubscribe = this.devicesView.selectedDevicesCollection.filter(function(device){
                if(device.get('status') !== STATUSES.DELETED){
                    return true;
                }
            });

            if (devicesToSubscribe.length <1) {
                return alert('Check some devices !!')
            }

            deviceIds = _.pluck(devicesToSubscribe, 'id');

            this.stateModel.set({
                action: {
                    name: 'subscribe',
                    data: {
                        deviceIds : deviceIds,
                        period    : period,
                        plan      : self.devicesView.stateModel.get('calculations')
                    }
                }
            });

            this.closeDevicesView();

            this.onModalHide(function () {
                var action = self.stateModel.get('action');
                if (!action.data.plan.amount) {
                    return self.subscribeHandler();
                }
                self.showStripe();
            });
        },

        confirmUnSubscribeModal: function () {
            var self = this;
            var deviceIds;

            var devicesToUnSubscribe = this.devicesView.selectedDevicesCollection.filter(function(device){
                if(device.get('status') === STATUSES.SUBSCRIBED){
                    return true;
                }
            });

            if (devicesToUnSubscribe.length <1) {
                return alert('Check some subscribed device(s) !!')
            }

            deviceIds = _.pluck(devicesToUnSubscribe, 'id');

            this.stateModel.set({
                action: {
                    name: 'unSubscribe',
                    data: {
                        deviceIds: deviceIds
                    }
                }
            });
            this.closeDevicesView();

            this.onModalHide(function () {
                self.unSubscribeHandler();
            });
        },

        subscribeHandler: function () {
            var self = this;
            var indikat = self.stateModel.get('action').data.plan.amount;
            var stateModel = this.stateModel.toJSON();
            var data = {
                deviceIds: stateModel.action.data.deviceIds,
                token    : stateModel.token,
                period   : stateModel.action.data.period
            };

            $.ajax({
                url          : '/devices/subscribe',
                method       : 'POST',
                contentType  : 'application/json',
                data         : JSON.stringify(data),
                beforeSend   : indikat ? self.showWaiting() : null,

                success: function () {
                    self.stateModel.set({
                        token   : null,
                        action  : null,
                        plan    : null
                    });

                    self.hideWaiting();
                    alert('Success subscription');
                    App.updateUser();
                },
                error: function (err) {
                    self.hideWaiting();
                    App.error(err);
                }
            });
        },

        showWaiting: function(){
                this.$el.find('#waitingModal').modal('show');
         },

        hideWaiting: function(){
                this.$el.find('#waitingModal').modal('hide');
            },

        unSubscribeHandler: function () {
            var self = this;
            var stateModel = this.stateModel.toJSON();
            var data = {
                deviceIds: stateModel.action.data.deviceIds
            };

            $.ajax({
                url         : '/devices/unsubscribe',
                method      : 'POST',
                contentType : 'application/json',
                data        : JSON.stringify(data),
                beforeSend  : self.showWaiting(),

                success: function () {
                    self.stateModel.set({
                        token  : null,
                        action : null
                    });
                    self.hideWaiting();
                    alert('Success unsubscribe');
                    App.updateUser();
                },
                error: function (err) {
                    self.hideWaiting();
                    App.error(err);
                }
            });
        },

        render: function () {
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
                tearsMonth : tearsMonth.toJSON(),
                tearsYear  : tearsYear.toJSON(),
                user       : App.sessionData.get('user')
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
