define([
    'text!templates/billingInfo/billingInfoTemplate.html',
    'collections/tariffPlansCollection'
], function (template, TariffPlansCollection) {

    var View = Backbone.View.extend({
        initialize: function (options) {

            this.collection = new TariffPlansCollection();

            this.collection.on('all', function(e){
                console.log('>>',e);
            });

            this.stateModel = new Backbone.Model({
                renewal: false,
                userPlan:null
                //TODO
            });

            this.setUserPlans();
            this.render();
            this.listenTo(this.stateModel, 'change', this.render);
            this.listenTo(this.collection, 'reset', this.render);
            this.listenTo(App.sessionData, 'change:tariffPlans', this.setUserPlans);
        },

        events: {
            "change #renewal": "renewal"
        },

        setUserPlans: function () {
            var plans = App.sessionData.get('tariffPlans');
            if (!plans) {
                return
            }

            this.collection.reset(plans);

            var userPlan = this.collection.find(function (model) {
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
            var tearsMonth =  new TariffPlansCollection(self.collection.filter(function(tier){
                if(tier.get('metadata').type === 'month'){
                    return true
                }
            }));

            var tearsYear =  new TariffPlansCollection(self.collection.filter(function(tier){
                if(tier.get('metadata').type === 'year'){
                    return true
                }
            }));

            data = _.extend(data, {
                tearsMonth: tearsMonth.toJSON(),
                tearsYear: tearsYear.toJSON(),
                user: App.sessionData.get('user')
            });

            data.tearsMonth = _.sortBy(data.tearsMonth, function(elem){
                return elem.amount;
            });
            data.tearsYear = _.sortBy(data.tearsYear, function(elem){
                return elem.amount;
            });

            console.log('>>>>>', data);
            this.$el.html(_.template(template, data));
            return this;
        },

        renewal: function () {
            this.stateModel.set({
                renewal: this.$el.find('#renewal').prop('checked')
            })
        }

    });

    return View;

});
