define([
    'text!templates/menu/menuItemTemplate.html'
], function (template) {

    var menuItemView = Backbone.View.extend({
        tagName: 'li',
        initialize: function (options) {
            this.render();
        },
        template: _.template(template),

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        }
    });
    return menuItemView;
});
