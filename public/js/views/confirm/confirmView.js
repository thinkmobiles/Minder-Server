define([
    'text!templates/confirm/confirmTemplate.html'
], function (template) {

    var View;
    View = Backbone.View.extend({

        initialize: function () {
            this.render();
        },

        render: function () {
            this.$el.html(_.template(template));
            return this;
        }

    });

    return View;

});
