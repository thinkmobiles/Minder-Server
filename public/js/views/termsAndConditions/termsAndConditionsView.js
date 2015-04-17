define([
    'text!templates/termsAndConditions/termsAndConditionsTemplate.html'
], function (template) {

    var View = Backbone.View.extend({
        el: '#wrapper',
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
