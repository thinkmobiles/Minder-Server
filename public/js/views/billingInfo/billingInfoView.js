define([
    'text!templates/billingInfo/billingInfoTemplate.html',
    'collections/tariffPlansCollection',
    'config/config',
    'stripeCheckout',
    'views/devices/devicesView'
], function (template, TariffPlansCollection, config, StripeCheckout, DevicesView) {

    var View = Backbone.View.extend({
        initialize: function (options) {
            var self = this;
            this.collection = new TariffPlansCollection();

            this.stateModel = new Backbone.Model({
                renewal: false,
                userPlan: null,
                proceedRenewal: false
            });

            this.stateModel.set({
                renewal: App.sessionData.get('user').billings.renewEnabled
            });

            App.sessionData.on('change:user', function () {
                this.stateModel.set({
                    renewal: App.sessionData.get('user').billings.renewEnabled
                });
            });

            this.Stripe = StripeCheckout.configure({
                key: config.strypePublicKay,
                image: '/images/logoForPaiments.jpg',
                token: function (token) {
                    self.stripeTokenHandler(token);
                },
                //currency:'USD',
                email: App.sessionData.get('user').email,
                panelLabel: 'Subscribe'
            });

            this.setUserPlans();
            this.render();
            this.listenTo(this.stateModel, 'change', this.render);
            this.listenTo(this.collection, 'reset', this.render);
            this.listenTo(App.sessionData, 'change:tariffPlans', this.setUserPlans);
        },

        events: {
            'click #saveRenewal': "renewal",
            'click #confirmSubscription': "confirmSubscription",
        },

        stripeTokenHandler: function (token) {
            this.stateModel.set({
                token: token
            });
            if (this.stateModel.get('proceedRenewal')) {
                this.proceedRenewal();

            }
        },

        confirmSubscription:function(){
            var devices = App.router.devicesView.selectedDevicesCollection.pluck('_id');
            $.ajax({
                url:'/devices/subscribe',
                method:'POST',
                data:{
                    devices:JSON.stringify(devices)
                },
                success:function(data){
                    console.log(data)
                    App.router.devicesView.selectedDevicesCollection.set(data);
                    App.router.devicesView.selectedDevicesCollection.reset();
                },
                error:function(err){
                    App.error(err);
                }
            });
        },

        setUserPlans: function () {
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

        render: function (options) {
            var self = this;
            var data = this.stateModel.toJSON();
            var tearsYear;
            var tearsMonth = new TariffPlansCollection(self.collection.filter(function (tier) {
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
        },

        renewal: function () {
            console.log('renewal');
            var checked = this.$el.find('#renewal').prop('checked');
            var user = App.sessionData.get('user');
            user.billings.renewEnabled = checked;
            App.sessionData.set({
                user: user
            });
            this.stateModel.set({
                token: null,
                proceedRenewal: true
            });
            if (checked) {
                this.showStripe();
            } else {
                this.proceedRenewal();
            }

        },
        proceedRenewal: function () {
            var data = {};
            data.token = this.stateModel.get('token');
            data.renewal = this.stateModel.get('renewal');
            $.ajax({
                url: '/renewal',
                data: data,
                method: 'POST',
                success: function () {
                    this.stateModel.set({
                        token: null,
                        proceedRenewal: false
                    });
                },
                error: function (err) {
                    App.error(err)
                }
            });
        },
        afterUpend:function(){
            this.stateModel.set({subscribe: false});
        },
        showStripe: function (e) {
            this.Stripe.open({
                name: 'Minder'
            });
        },
        setParams: function (params) {
            console.log('setParams', params);
            if(params.subscribe === 'subscribe'){
                this.showModal();
            }
        },
        showModal:function(){
            if(!App.router.devicesView){
                return;
            }
            if(this.devicesView){
                this.devicesView.undelegateEvents();
                this.devicesView.remove();
            }

            this.devicesView = new DevicesView({modal:true});
            this.devicesView.selectedDevicesCollection = App.router.devicesView.selectedDevicesCollection;

            this.$el.find('#modalContent').append(this.devicesView.el);
            this.$el.find('#devicesModal').modal({show: true});
        },
    });

    return View;

});
