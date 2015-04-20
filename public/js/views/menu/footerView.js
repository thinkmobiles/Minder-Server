define([
    'text!templates/menu/footerTemplate.html'
], function (template) {

    var MainView = Backbone.View.extend({
        el: '#footer',
        initialize: function (options) {
            this.render();
        },

        render: function () {
            this.$el.html(_.template(template));
            return this;
        }
    });
    return MainView;
});