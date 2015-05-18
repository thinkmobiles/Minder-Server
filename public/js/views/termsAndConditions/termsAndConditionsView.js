define([
    'text!templates/termsAndConditions/termsAndConditionsTemplate.html'
], function (template) {

    var View;
    View = Backbone.View.extend({

        initialize: function () {

            // nothing to comment =)
            this.render();
        },

        render: function () {
            this.$el.html(_.template(template));
            return this;
        }

    });

    return View;

});
