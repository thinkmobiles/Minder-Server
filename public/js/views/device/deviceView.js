define([
    'text!templates/device/deviceTemplate.html',
    'models/deviceModel'
], function (template, DeviceModel) {

    var forgotPasswordView = Backbone.View.extend({
        initialize: function (options) {
            this.stateModel = new Backbone.Model();
            this.listenTo(this.stateModel, 'change', this.render);
            //this.listenTo(this.model, 'change', this.render);

            this.render();
        },

        afterUpend: function () {
            if (this.model) {
                this.stopListening(this.model);
                this.model = null;
            }
        },

        setParams: function (params) {
            this.stateModel.set(params);
            this.getDevice()
        },

        getDevice: function () {
            var device = null;
            var _this = this;

            if (App.router.devicesView) {
                device = App.router.devicesView.devisesCollection.find(function (model) {
                    if (model.id === _this.stateModel.get('id')) {
                        return true;
                    }
                })
            }
            if (!device) {
                device = new DeviceModel({
                    _id: this.stateModel.get('id')
                });
                device.fetch();

            }
            this.model = device;
            this.listenTo(this.model, 'change', function () {
                _this.render();
            });
            this.listenTo(this.model, 'sync', function () {
                if (this.model.changed.success) {
                    _this.afterUpend();
                    if (window.history) {
                        if (window.history.back) {
                            window.history.back();
                        }
                    }
                }

            });
            this.render();
        },

        events: {
            'submit #editDevice': 'update',
            'click .save': 'update'
        },


        update: function (event) {
            event.preventDefault();
            this.model.save({
                name: this.$el.find('#name').val()
            });
        },
        render: function (options) {
            var data = this.stateModel.toJSON();
            if (this.model) {
                data = _.extend(this.model.toJSON(), data);
            }
            this.$el.html(_.template(template, data));
            return this;
        }
    });

    return forgotPasswordView;

});
