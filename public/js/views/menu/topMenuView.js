define([
    'text!templates/menu/topMenuTemplate.html'
], function (topMenuTemplate) {

    var View;
    View = Backbone.View.extend({
        el: '#topMenu',

        events: {
            'click #logOut': 'logout'
        },

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

        topRightMenuItemsRaw:[
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

            this.render();
        },

        // logout action
        logout: function () {
            $.ajax({
                url: "/signOut",
                type: "POST",
                success: function () {
                    App.router.navigate("login", {trigger: true});

                    // remove user data
                    // and trigger other views to clean up
                    // and block routs
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
            console.log('top menu render');
            var authorized = App.sessionData.get('authorized');
            var data = {
                top: this.topMenuLeftItemsRaw,
                dropDown: this.topMenuRightDropdownItemsRaw,
                topRight: this.topRightMenuItemsRaw,
                authorized: authorized
            };


            this.$el.html(_.template(topMenuTemplate, data));
            return this;
        }
    });
    return View;
});