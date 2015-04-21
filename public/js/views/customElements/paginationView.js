define([
    'text!templates/customElements/paginationTemplate.html'
], function (template) {

    var View = Backbone.View.extend({
        initialize: function (options) {
            this.stateModel = new Backbone.Model({
                count: options.count || 10
            });
            this.render();
        },
        tagName: 'nav',
        events: {
            //'click .deviseMainPageCheck': 'updateCheck',
            //'click': 'updateCheck'
        },

        render: function (options) {
            var data = this.stateModel.toJSON();
            //data = _.extend(data, this.model.toJSON());
            this.$el.html(_.template(template, data));
            return this;
        }
    });

    return View;

});
