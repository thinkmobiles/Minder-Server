define([
    'config/config',
    'collections/menu/MenuItems',
    'text!templates/menu/topMenuTemplate.html',
    'views/menu/menuItemView'
], function (config, MenuItemsCollection, topMenuTemplate, menuItemView) {

    var MainView = Backbone.View.extend({
        el: '#topMenu',
        initialize: function (options) {
            var self = this;
            this.render();

            var collection = new MenuItemsCollection();
            this.collection = collection;

            var menuItemsRaw = [
                {
                    name: "Home",
                    url: "main",
                    title: "Home page"
                }, {
                    name: "Devices",
                    url: "devices",
                    title: "User devices management"
                }, {
                    name: "User management",
                    url: "userManagement",
                    title: "Admin user management"
                }
            ];


            collection.add(menuItemsRaw);

            console.log('>>>>> collection', collection);

            collection.map(function (model) {
                console.log('>>>>> model', model);
                var view = new menuItemView({model: model});
                self.$el.append(view.render().el);
            });

            //_.each(collection, function (model) {
            //    var view = new menuItemView({model: model});
            //    self.$el.append(view.render().el);
            //});
        },

        render: function () {
            console.log('>>>>>', topMenuTemplate);
            this.$el.html(_.template(topMenuTemplate));
            return this;
        }
    });
    return MainView;
});