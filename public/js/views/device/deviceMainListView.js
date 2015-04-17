define([
    'text!templates/device/deviceMainListTemplate.html'
], function (template) {

    var forgotPasswordView = Backbone.View.extend({
        stateModel: new Backbone.Model({}),
        initialize: function (options) {
            this.stateModel = new Backbone.Model({
                checked: false
            });
            this.listenTo(this.stateModel, 'change', this.render);
            this.listenTo(this.model, 'change', this.render);
            this.render();
        },

        events: {
            'click .deviseMainPageCheck': 'updateCheck'
        },
        updateCheck: function () {
            this.stateModel.set({
                checked: this.$el.find('.deviseMainPageCheck').prop('checked')
            });
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
