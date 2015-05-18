define([
    'text!templates/menu/topMenuTemplate.html'
], function (topMenuTemplate) {

    var View;
    View = Backbone.View.extend({
        el: '#topMenu',

        events: {
            'click #logOut': 'logout'
        },

        // if authorized items
        topMenuLeftItemsRaw: [
            {
                name: "Home",
                url: "#main",
                title: "Home page"
            }, {
                name: "Devices",
                url: "#devices",
                title: "User devices management"
            }, {
                name: "Billing info",
                url: "#billingInfo",
                title: "User billing info"
            }
        ],

        topMenuRightDropdownItemsRaw: [
            {
                name: "Profile",
                url: "#profile",
                title: "User profile"
            }
        ],

        // if !authorized items
        topRightMenuItemsRaw: [
            {
                name: "Sign in",
                url: "#login",
                title: "Sign in to MinderWeb"
            }, {
                name: "Sign up",
                url: "#signUp",
                title: "Sign up to MinderWeb"
            }
        ],

        initialize: function () {
            // keep menu actual
            this.listenTo(App.sessionData, 'change:authorized', this.render);
            this.listenTo(App.sessionData, 'change:user', this.render);

            this.render();
        },

        // logout action
        logout: function () {
            $.ajax({
                url: "/signOut",
                type: "POST",
                success: function () {
                    // remove user data
                    // and trigger other views to clean up
                    // and block routs
                    App.sessionData.set({
                        authorized: false,
                        admin: false,
                        user: null
                    });
                    App.router.navigate("login", {trigger: true});
                },
                error: function (err) {
                    App.error(err);
                }
            });
        },

        // if the user name is to long cut it
        prettifyString: function (string, size) {
            if (!size) {
                size = 20;
            }
            if (string.length > size) {
                return string.slice(0, size - 3) + '...';
            }
            return string;
        },

        render: function () {
            var authorized = App.sessionData.get('authorized');
            var user = App.sessionData.get('user');
            var data = {
                top: this.topMenuLeftItemsRaw,
                dropDown: this.topMenuRightDropdownItemsRaw,
                topRight: this.topRightMenuItemsRaw,
                authorized: authorized
            };

            // if the user name is to long cut it
            if (user) {
                data.username = this.prettifyString(user.firstName + ' ' + user.lastName, 20);
            }


            this.$el.html(_.template(topMenuTemplate, data));
            return this;
        }
    });
    return View;
});