define([
    'text!templates/menu/menuDropDownTemplate.html',
    'views/menu/menuItemView'
], function (template, menuItemView) {

    var dropDownMenuItemView = Backbone.View.extend({
        tagName: 'li',
        className: 'dropdown',
        dropDownName: 'Dropdown',
        initialize: function (options) {
            var self = this;
            var collection = this.collection;
            if (options.dropDownName) this.dropDownName = options.dropDownName;
            this.render();
            collection.map(function (model) {
                var view = new menuItemView({model: model});
                self.$el.find('.dropdown-menu').append(view.render().el);
            });
        },
        template: _.template(template),

        render: function () {
            //this.$el.html(this.template(this.model.toJSON()));
            this.$el.html(this.template({
                dropDownName: this.dropDownName
            }));
            return this;
        }
    });
    return dropDownMenuItemView;
});
