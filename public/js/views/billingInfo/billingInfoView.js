define([
    'text!templates/billingInfo/billingInfoTemplate.html',
    'collections/tariffPlansCollection'
], function (template, TariffPlansCollection) {

    var View = Backbone.View.extend({
        //el: '#wrapper',
        initialize: function (options) {


            this.collection = new TariffPlansCollection();

            this.stateModel = new Backbone.Model({
                renewal: false
                //TODO
            });


            var userPlan = this.collection.find(function (model) {
                console.log(App.sessionData.get('user'));
                console.log(model.get('name'));
                if (model.get('name') === App.sessionData.get('user').currentPlan) {
                    return true;
                }
            });

            this.stateModel.set({
                userPlan: userPlan
            });

            console.log('.....', userPlan);
            this.setUserPlans();
            this.render();
            this.listenTo(this.stateModel, 'change', this.render);
            this.listenTo(this.collection, 'change sort sync add', this.render);
           // App.stateModel.on('change:tariffPlans', this.setUserPlans);
            this.listenTo(App.sessionData, 'change:tariffPlans', this.setUserPlans);


        },

        events: {
            "change #renewal": "renewal"
        },

        setUserPlans:function(){
            var plans = App.sessionData.get('tariffPlans');
            if(plans){
                this.collection.add(plans);
            }
        },

        render: function (options) {
            var _this = this;
            var data = this.stateModel.toJSON();
            data = _.extend(data, {
                collection: _this.collection.toJSON()
            });
            console.log('render', data);
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
