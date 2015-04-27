define([
    'text!templates/device/deviceMainListTemplate.html'
], function (template) {

    var forgotPasswordView = Backbone.View.extend({
        initialize: function (options) {
            this.stateModel = new Backbone.Model({
                checked: false,
                deviceCid: this.model.cid,
                detail: options.detail || false,
                edit: options.edit || false,
                del: options.del || false
            });
            this.listenTo(this.stateModel, 'change', this.render);
            this.listenTo(this.model, 'change', this.render);
            this.render();
        },

        events: {
            'click .deviseMainPageCheck': 'updateCheck',
            'click .delete': 'deleteDevice'

        },
        updateCheck: function () {
            this.stateModel.set({
                checked: this.$el.find('.deviseMainPageCheck').prop('checked')
            });
        },
        deleteDevice: function () {
            console.log('deleteDevice');
            if (window.confirm("Delete?")) {
                this.model.destroy();
            }
        },
        render: function (options) {
            var data = this.stateModel.toJSON();
            data = _.extend(data, this.model.toJSON());
            this.$el.html(_.template(template, data));
            return this;
        }
    });

    return forgotPasswordView;

});
