define([
    'config/config',
    'collections/menu/MenuItems',
    'text!templates/menu/topMenuTemplate.html',
    'views/menu/menuItemView',
    'views/menu/dropDownMenuView'
], function (config, MenuItemsCollection, topMenuTemplate, menuItemView, DropDownMenuView) {

    var MainView = Backbone.View.extend({
        el: '#topMenu',

        topMenuLeftItemsRaw: [
            {
                name: "Home",
                url: "#main",
                title: "Home page",
                action: false,
                authorized: true,
                administrator: false
            }, {
                name: "Devices",
                url: "#devices",
                title: "User devices management",
                action: false,
                authorized: true,
                administrator: false
            }, {
                name: "Billing info",
                url: "#billingInfo",
                title: "User billing info",
                action: false,
                authorized: true,
                administrator: false
            }, {
                name: "User management",
                url: "#userManagement",
                title: "Admin user management",
                action: false,
                authorized: true,
                administrator: true
            }
            //{
            //    name: "Contact us",
            //    url: "#contactUs",
            //    title: "press here if you wont contact with us"
            //}
        ],

        topMenuRightDropdownItemsRaw: [
            {
                name: "Profile",
                url: "#profile",
                title: "User profile",
                action: false,
                authorized: true,
                administrator: false
            }, {
                name: "Logout",
                url: "#logout",
                title: "User logout",
                action: 'logout',
                authorized: true,
                administrator: true
            }
        ],

        initialize: function (options) {

            this.topMenuLeftItemsCollection = new MenuItemsCollection();


            this.topMenuRightDropdownItemsCollection = new MenuItemsCollection();


            this.topMenuLeftItemsCollection.add(this.topMenuLeftItemsRaw);
            this.topMenuRightDropdownItemsCollection.add(this.topMenuRightDropdownItemsRaw);


            this.views = [];
            this.render();
            this.listenTo(App.sessionData, 'change', this.renderMenuItems);

        },

        renderMenuItems: function () {
            var _this = this;
            _.each(this.views, function (view) {
                view.remove();
            });


            this.topMenuLeftItemsCollection.map(function (model) {
                console.log('>>>>>>', model.get('administrator') === App.sessionData.get('admin'));
                if (model.get('administrator') === App.sessionData.get('admin') && App.sessionData.get('authorized')) {
                    var view = new menuItemView({model: model});
                    _this.views.push(view);
                    _this.$('#topMenuLeft').append(view.render().el);
                    return
                }
                if (model.get('authorized') === App.sessionData.get('authorized') && !model.get('administrator')) {
                    var view = new menuItemView({model: model});
                    _this.views.push(view);
                    _this.$('#topMenuLeft').append(view.render().el);
                    return
                }

            });

            var view = new DropDownMenuView({
                dropDownName: 'User menu',
                collection: _this.topMenuRightDropdownItemsCollection
            });
            this.views.push(view);
            this.$('#topMenuRight').append(view.el);


            return this;
        },

        render: function () {
            var _this = this;
            this.$el.html(_.template(topMenuTemplate));
            this.renderMenuItems();
            return this;
        }
    });
    return MainView;
});