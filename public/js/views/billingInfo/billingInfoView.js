define([
    'text!templates/billingInfo/billingInfoTemplate.html',
    'collections/tariffPlansCollection'
], function (template, TariffPlansCollection) {

    var View = Backbone.View.extend({
        //el: '#wrapper',
        initialize: function (options) {
            this.stateModel = new Backbone.Model({
                renewal: false
            });


            this.collection = new TariffPlansCollection();

            this.listenTo(this.stateModel, 'change', this.render);
            this.listenTo(this.collection, 'change', this.render);
            this.listenTo(this.collection, 'sort', this.render);
            this.listenTo(this.collection, 'sync', this.render);
            //this.collection.on('all', function (e) {
            //    console.log('event', e);
            //});

            this.render();
            this.collection.set([
                {
                    name: 'T1',
                    description: 'lololo',
                    cost: 0,
                    minDevices: 0,
                    maxDevices: 1,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }, {
                    name: 'T2',
                    description: 'lololo',
                    cost: 2.50,
                    minDevices: 2,
                    maxDevices: 4,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }, {
                    name: 'T3',
                    description: 'lololo',
                    cost: 5.0,
                    minDevices: 5,
                    maxDevices: 10,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }, {
                    name: 'T4',
                    description: 'lololo',
                    cost: 10,
                    minDevices: 11,
                    maxDevices: 50,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }, {
                    name: 'T5',
                    description: 'lololo',
                    cost: 20,
                    minDevices: 51,
                    maxDevices: 500,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]);

        },

        events: {
            "change #renewal": "renewal"
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
