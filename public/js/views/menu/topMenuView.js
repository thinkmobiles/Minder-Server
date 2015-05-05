define([
    'text!templates/menu/topMenuTemplate.html'
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
            }, {
                name: "Devices",
                url: "#devices",
                title: "User devices management",
                authorized: true
            }, {
                name: "Billing info",
                url: "#billingInfo",
                title: "User billing info",
                authorized: true
            }
        ],
        topMenuRightDropdownItemsRaw: [
            {
                name: "Profile",
                url: "#profile",
                title: "User profile",
                authorized: true
            }
        ],

        initialize: function (options) {
            this.listenTo(App.sessionData, 'change', this.render);
        },

        logout: function () {
            $.ajax({
                url: "/signOut",
                type: "POST",
                success: function (response) {
                    App.router.navigate("login", {trigger: true});
                    App.sessionData.set({
                        authorized: false,
                        admin: false,
                        user: null
                    });
                },
                error: function (err) {
                    App.error(err);
                }
            });
        },
        render: function () {
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