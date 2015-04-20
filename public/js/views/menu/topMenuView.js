define([
    'config/config',
    'collections/menu/MenuItems',
    'text!templates/menu/topMenuTemplate.html',
    'views/menu/menuItemView',
    'views/menu/dropDownMenuView'
], function (config, MenuItemsCollection, topMenuTemplate, menuItemView, DropDownMenuView) {

    var MainView = Backbone.View.extend({
        el: '#topMenu',
        initialize: function (options) {
            var self = this;
            this.render();

            var topMenuLeftItemsCollection = new MenuItemsCollection();
            this.topMenuLeftItemsCollection = topMenuLeftItemsCollection;

            var topMenuRightDropdownItemsCollection = new MenuItemsCollection();
            this.topMenuRightDropdownItemsCollection = topMenuRightDropdownItemsCollection;

            var topMenuLeftItemsRaw = [
                {
                    name: "Home",
                    url: "#main",
                    title: "Home page"
                }, {
                    name: "Devices",
                    url: "#devices",
                    title: "User devices management"
                }, {
                    name: "User management",
                    url: "#userManagement",
                    title: "Admin user management"
                }
                //{
                //    name: "Contact us",
                //    url: "#contactUs",
                //    title: "press here if you wont contact with us"
                //}
            ];

            var topMenuRightDropdownItemsRaw = [
                {
                    name: "Profile",
                    url: "#profile",
                    title: "User profile"
                }, {
                    name: "Billing info",
                    url: "#billingInfo",
                    title: "User billing info"
                }, {
                    name: "Logout",
                    url: "#logout",
                    title: "User logout"
                }
            ];


            topMenuLeftItemsCollection.add(topMenuLeftItemsRaw);
            topMenuRightDropdownItemsCollection.add(topMenuRightDropdownItemsRaw);

            topMenuLeftItemsCollection.map(function (model) {
                var view = new menuItemView({model: model});
                self.$('#topMenuLeft').append(view.render().el);
            });

            this.dropDownMenuView = new DropDownMenuView({
                dropDownName: 'User menu',
                collection: topMenuRightDropdownItemsCollection
            });
            this.$('#topMenuRight').append(this.dropDownMenuView.el);
        },

        render: function () {
            this.$el.html(_.template(topMenuTemplate));
            return this;
        }
    });
    return MainView;
});