define([
    'text!templates/menu/menuDropDownTemplate.html',
    'views/menu/menuItemView'
], function (template, menuItemView) {

    var dropDownMenuItemView = Backbone.View.extend({
        tagName: 'li',
        className: 'dropdown',
        dropDownName: 'Dropdown',
        initialize: function (options) {
            if (options.dropDownName) this.dropDownName = options.dropDownName;
            this.views = [];
            this.render();
            this.renderMenuItems();
        },
        template: _.template(template),

        render: function () {
            this.$el.html(this.template({
                dropDownName: this.dropDownName
            }));
            return this;
        },

        renderMenuItems: function () {
            var self = this;
            _.each(this.views, function (view) {
                view.remove();
            });


            this.collection.map(function (model) {
                var view;
                if (model.get('administrator') === App.sessionData.get('admin') && App.sessionData.get('authorized')) {
                    view = new menuItemView({model: model});
                    self.views.push(view);
                    self.$('.dropdown-menu').append(view.render().el);
                    return
                }
                if (model.get('authorized') === App.sessionData.get('authorized') && !model.get('administrator')) {
                    view = new menuItemView({model: model});
                    self.views.push(view);
                    self.$('.dropdown-menu').append(view.render().el);
                    return
                }

            });
            return this;
        }
    });
    return dropDownMenuItemView;
});
