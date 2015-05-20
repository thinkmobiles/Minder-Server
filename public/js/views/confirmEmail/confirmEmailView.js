/**
 * Created by ANDREY on 19.05.2015.
 */

define([
    'text!templates/confirmEmail/confirmEmailTemplate.html'
], function (template) {

    var View = Backbone.View.extend({
        initialize: function () {
            this.render();
        },

        setParams: function (params) {
            this.token=params.token;
            this.checkLogin();
        },

        checkLogin: function(){
            var token = this.token;
            var thisEl=this.$el;

            $.ajax({
                url: "/confirmEmail/"+token,
                type: "GET",
                success: function () {
                    thisEl.find('#confirm_email').text('Your account has been activated!');
                },
                error: function (err) {
                    App.error(err);
                    thisEl.find('#confirm_email').text('Wrong activation code!');
                }
            });
        },

        render: function () {

            this.$el.html(_.template(template));
            return this;
        }

    });

    return View;

});
