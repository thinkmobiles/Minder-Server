define([
    'text!templates/menu/topMenuTemplate.html'
], function (topMenuTemplate) {

    var View;
    View = Backbone.View.extend({

        el: '#topMenu',

        events: {
            'click #logOut'       : 'logout',
            'click .topMenuItem'  : 'changeTab'
        },

        topMenuLeftItemsRaw: [
            {
                name   : "Home",
                url    : "#main",
                title  : "homepage_but"
            }, {
                name   : "Devices",
                url    : "#devices",
                title  : "devices_but"
            }, {
                name   : "Billing info",
                url    : "#billingInfo",
                title  : "billing_but"
            }
        ],
        topMenuRightDropdownItemsRaw: [
            {
                name   : "Profile",
                url    : "#profile",
                title  : "User profile"
            }
        ],
        topRightMenuItemsRaw: [
            {
                name   : "Sign in",
                url    : "#login",
                title  : "signin_but"
            }, {
                name   : "Sign up",
                url    : "#signUp",
                title  : "Signup_but"
            }
        ],

        initialize: function () {
            this.listenTo(App.sessionData, 'change:authorized', this.render);
            this.listenTo(App.sessionData, 'change:user', this.render);

            this.render();
        },

        changeTab: function(event) {
            var holder = $(event.target);
            var closestEl = holder.closest('.loggedMenu');
            closestEl.find(".active").removeClass("active");
            holder.addClass("active");

        },

        logout: function () {
            $.ajax({
                url  : "/signOut",
                type : "POST",

                success: function () {
                    App.sessionData.set({
                        authorized : false,
                        admin      : false,
                        user       : null
                    });
                    App.router.navigate("login", {trigger: true});
                },
                error: function (err) {
                    App.error(err);
                }
            });
        },

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
            var activeButton = window.location.hash;
            var data = {
                top        : this.topMenuLeftItemsRaw,
                dropDown   : this.topMenuRightDropdownItemsRaw,
                topRight   : this.topRightMenuItemsRaw,
                authorized : authorized,
                actButt    : activeButton
            };

            if (user) {
                data.username = this.prettifyString(user.firstName + ' ' + user.lastName, 20);
            }

            this.$el.html(_.template(topMenuTemplate, data));
            return this;
        }
    });
    return View;
});