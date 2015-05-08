define([
    'text!templates/device/deviceMainListTemplate.html'
], function (template) {

    var View;
    View = Backbone.View.extend({
        initialize: function (options) {

            // set the state model of view
            this.stateModel = new Backbone.Model({
                checked: false,
                deviceCid: this.model.cid,
                detail: options.detail || false,
                edit: options.edit || false,
                del: options.del || false
            });

            // keep data actual
            this.listenTo(this.stateModel, 'change', this.render);
            this.listenTo(this.model, 'change', this.render);

            this.render();
        },

        events: {
            'click .deviseMainPageCheck': 'updateCheck',
            'click .delete': 'deleteDevice'
        },

        // check box observer
        updateCheck: function () {
            this.stateModel.set({
                checked: this.$el.find('.deviseMainPageCheck').prop('checked')
            });
        },

        render: function () {
            var data = this.stateModel.toJSON();

            // concat visual view and actual model data
            data = _.extend(data, this.model.toJSON());

            this.$el.html(_.template(template, data));

            return this;
        }
    });

    return View;

});
