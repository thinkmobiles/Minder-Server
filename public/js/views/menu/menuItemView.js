define([
    'text!templates/menu/menuItemTemplate.html'
], function (template) {

    var menuItemView = Backbone.View.extend({
        tagName: 'li',
        initialize: function (options) {
            this.render();
        },
        template: _.template(template),

        events: {
            "click .action": "runAction"
        },

        render: function () {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },
        runAction: function () {
            if (this[this.model.get('action')]) {
                this[this.model.get('action')]();
            }
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
                    console.log('logout error', err);
                    App.error(err);
                }
            });
        }
    });
    return menuItemView;
});
