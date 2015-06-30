define([
    'text!templates/billingInfo/billingInfoTemplate.html',
    'collections/tariffPlansCollection',
    'config/config',
    'stripeCheckout',
    'views/devices/devicesView',
    'constants/statuses'
], function (template, TariffPlansCollection, config, StripeCheckout, DevicesView, STATUSES) {

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

            App.sessionData.on('change:user change:tariffPlans', function () {
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
                key: config.stripePublicKey,
                image: '/images/logoForPaiments.jpg',
                token: function (token) {
                    self.stripeTokenHandler(token); ////// singe!!! coll when token is generated ... for all actions!
                },
                email: App.sessionData.get('user').email,
                panelLabel: 'Subscribe'
            });

            this.setUserPlans();
            this.render();
        },

        events: {
            'click #saveRenewal'              : "renewal", // start renewal actions chain
            'click #showProceedSubscription'  : "showProceedSubscriptionModal", // show ProceedSubscription modal
            'click .cancelSubscription'       : "cancelProceedSubscriptionModal", // hide modal and destroy devices view
            'click #confirmSubscription'      : "confirmProceedSubscriptionModal",// start ProceedSubscription chain
            'click #confirmUnSubscribe'       : "confirmUnSubscribeModal"// start UnSubscribe chain
        },

        setUserPlans: function () { // find and set user plan
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
                renewal: checked,
                action: {
                    name: 'renewal'
                }
            });

            if (checked) {
                // if checked showStripe and get token
                this.showStripe();
            } else {
                // send request
                this.renewalHandler();
            }
        },

        // send renewal request and update user data
        renewalHandler: function () {
            var self = this;
            var data = {};
            data.renewal = this.stateModel.get('renewal');
            if (data.renewal) {
                // if checked send token
                data.token = this.stateModel.get('token');
            }
            $.ajax({
                url: '/renewal',
                contentType: 'application/json',
                data: JSON.stringify(data),
                method: 'PUT',
                success: function () {
                    // clean data
                    self.stateModel.set({
                        token: null,
                        action: null
                    });
                    App.updateUser();
                    alert('Updated successful!');
                },
                error: function (err) {
                    App.error(err)
                }
            });
        },

        //end////// RENEWAL //////// RENEWAL //////// RENEWAL ////////

        //start////// SUBSCRIPTION MODAL //////// SUBSCRIPTION MODAL //////// SUBSCRIPTION MODAL

        // cb when modal is hidden closed to prevent css errors
        onModalHide: function (cb) {
            this.$el.find('#proceedSubscriptionModal').on('hidden.bs.modal', function () {
                cb();
            });
        },

        closeDevicesView: function () {
            // hide modal
            this.$el.find('#proceedSubscriptionModal').modal('hide');
            // remove devices view
            if (this.devicesView) {
                this.devicesView.undelegateEvents();
                this.devicesView.remove();
            }
        },

        // open the modal
        showProceedSubscriptionModal: function () {
            // prevent errors on slow computers
            this.closeDevicesView();

            // remove cb events from modal (onModalHide())
            this.$el.find('#proceedSubscriptionModal').off('hidden.bs.modal');

            this.$el.find('#proceedSubscriptionModal').modal({
                show: true,
                backdrop: 'static' // not close the modal when click on background
            });

            this.devicesView = new DevicesView({modal: true});

            // append devicesView to modal
            this.$el.find('#modalContent').append(this.devicesView.el);

        },

        // close the modal
        cancelProceedSubscriptionModal: function () {
            this.closeDevicesView();
        },

        // ProceedSubscription chain start
        confirmProceedSubscriptionModal: function () { // set action and data for it
            var self = this;
            var devicesToSubscribe = [];
            var invalidToSubscribe = [];
            var deviceIds = [];
            var period = this.devicesView.stateModel.get('period'); // get payments period


            // filters the selected devices
            devicesToSubscribe = this.devicesView.selectedDevicesCollection.filter(function(device){
                if(device.get('status') !== STATUSES.DELETED){
                    return true;
                }
            });

            if (devicesToSubscribe.length <1) {
                return alert('Check some devices !!')
            }

            /*invalidToSubscribe = this.devicesView.selectedDevicesCollection.filter(function(device){
                if(device.get('status') === STATUSES.SUBSCRIBED){
                    return true;
                }
            });if (invalidToSubscribe.length>0) {
                alert('You checked ' +devicesToSubscribe.length+'  '+ invalidToSubscribe.length + ' device(s), which already has been subscribed !');
            };*/


            // get ids
            deviceIds = _.pluck(devicesToSubscribe, 'id');

            // set the actual action status to continue the chain
            this.stateModel.set({
                action: {
                    name: 'subscribe',
                    data: {
                        deviceIds: deviceIds,
                        period: period,
                        plan: self.devicesView.stateModel.get('calculations')
                    }
                }
            });

            // close the modal
            this.closeDevicesView();

            // when modal closed continue the chain
            this.onModalHide(function () {
                var action = self.stateModel.get('action');
                // if free do not show stripe
                if (!action.data.plan.amount) {
                    // send request to server
                    return self.subscribeHandler();
                }
                // get token
                self.showStripe();
            });
        },

        confirmUnSubscribeModal: function () { // set action and data for it
            var self = this;
            var deviceIds = [];

            // filter selected devices
            var devicesToUnSubscribe = this.devicesView.selectedDevicesCollection.filter(function(device){
                if(device.get('status') === STATUSES.SUBSCRIBED){
                    return true;
                }
            });

            if (devicesToUnSubscribe.length <1) {
                return alert('Check some subscribed device(s) !!')
            };

            // get ids
            deviceIds = _.pluck(devicesToUnSubscribe, 'id');

            // set the actual action status to continue the chain
            this.stateModel.set({
                action: {
                    name: 'unSubscribe',
                    data: {
                        deviceIds: deviceIds
                    }
                }
            });
            // close modal
            this.closeDevicesView();

            //when modal hide (to prevent css errors) send request
            this.onModalHide(function () {
                self.unSubscribeHandler();
            });
        },



        // send request to server
        subscribeHandler: function () { // handel action
            var self = this;
            var stateModel = this.stateModel.toJSON();
            var data = {
                deviceIds: stateModel.action.data.deviceIds,
                token    : stateModel.token,
                period   : stateModel.action.data.period
            };

            //startAnimation();
            $.ajax({
                url: '/devices/subscribe',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(data),
                beforeSend: self.showWaiting(),
                //complete: self.hideWaiting(),
                success: function () {

                    // clean data from memory
                    self.stateModel.set({
                        token: null,
                        action: null,
                        plan: null
                    });

                    self.hideWaiting();
                    alert('Success subscription');

                    // update user data to keep actual
                    App.updateUser();
                },
                error: function (err) {
                    self.hideWaiting();
                    App.error(err);
                }
            });
        },

        showWaiting: function(){
            this.$el.find('#waitingModal').modal({
                show: true,
                backdrop: 'static'
            });
         },

        hideWaiting: function(){
            this.$el.find('#waitingModal').modal('hide');
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
                    alert('Success unsubscribe');

                    // update user data to keep actual
                    App.updateUser(); //:TODO OPTIMIZE
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

            // filter month plans
            tearsMonth = new TariffPlansCollection(self.collection.filter(function (tier) {
                if (tier.get('metadata').type === 'month') {
                    return true
                }
            }));

            // filter year plans
            tearsYear = new TariffPlansCollection(self.collection.filter(function (tier) {
                if (tier.get('metadata').type === 'year') {
                    return true
                }
            }));

            // concat data
            data = _.extend(data, {
                tearsMonth: tearsMonth.toJSON(),
                tearsYear: tearsYear.toJSON(),
                user: App.sessionData.get('user')
            });

            // sort plans
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
