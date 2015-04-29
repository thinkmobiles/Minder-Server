define([
    //'config/config',
    //'collections/menu/MenuItems',
    'text!templates/menu/topMenuTemplate.html',
    //'views/menu/menuItemView',
    //'views/menu/dropDownMenuView'
], function (topMenuTemplate) {

    var MainView = Backbone.View.extend({
        el: '#topMenu',

        events: {
            'click #logOut': 'logout'
        },

        topMenuLeftItemsRaw: [
            {
                name: "Home",
                url: "#main",
                title: "Home page",
                authorized: true
                //administrator: false
            }, {
                name: "Devices",
                url: "#devices",
                title: "User devices management",
                authorized: true
                //administrator: false
            }, {
                name: "Billing info",
                url: "#billingInfo",
                title: "User billing info",
                authorized: true
                //administrator: false
            }
            //, {
            //    name: "User management",
            //    url: "#userManagement",
            //    title: "Admin user management",
            //    action: false,
            //    authorized: true,
            //    administrator: true
            //}
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
                authorized: true
                //administrator: false
            }
            //, {
            //    name: "Logout",
            //    url: "#logout",
            //    title: "User logout",
            //    action: 'logout',
            //    authorized: true
            //    //administrator: false
            //}
        ],

        initialize: function (options) {

            //this.topMenuCollection = new MenuItemsCollection();
            //
            //
            //this.dropDownCollection = new MenuItemsCollection();


            //this.topMenuCollection = new Backbone.Collection(this.topMenuLeftItemsRaw);
            //this.dropDownCollection = new Backbone.Collection(this.topMenuRightDropdownItemsRaw);


            //this.views = [];

            this.listenTo(App.sessionData, 'change', this.render);
            App.sessionData.on('change', function (e) {
                console.log('--sessionData--', e);
            });
            //this.render();

        },

        logout: function () {
            $.ajax({
                url: "/signOut",
                type: "POST",
                success: function (response) {
                    App.router.navigate("login", {trigger: true});
                    console.log('logout success');
                    App.sessionData.set({
                        authorized: false,
                        admin: false,
                        user: null
                    });
                },
                error: function (err) {
                    console.log('logout error', err);
                    App.error(err);
                }
            });
        },
        render: function () {
            var _this = this;
            var authorized = App.sessionData.get('authorized');
            var data = {
                top: [],
                dropDown: [],
                authorized: authorized
            };
            _.each(this.topMenuLeftItemsRaw, function (item) {
                if (item.authorized === authorized) {
                    data.top.push(item);
                }
            });
            _.each(this.topMenuRightDropdownItemsRaw, function (item) {
                if (item.authorized === authorized) {
                    data.dropDown.push(item);
                }
            });
            this.$el.html(_.template(topMenuTemplate, data));
            return this;
        }
    });
    return MainView;
});