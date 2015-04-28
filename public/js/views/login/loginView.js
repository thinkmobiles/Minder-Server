define([
    'text!templates/login/LoginTemplate.html',
    'custom',
    'validation',
    'communication'
], function (LoginTemplate, Custom, validation, Communication) {

    var LoginView = Backbone.View.extend({
        //el: '#wrapper',
        initialize: function (options) {
            this.stateModel = new Backbone.Model({
                email: '',
                password: '',
                errors: false,
                messages: false
            });
            this.listenTo(this.stateModel, 'change', this.render);
            this.render();
        },


        events: {
            "submit #loginForm": "login",
            "click .login-button": "login"
        },

        render: function (options) {
            this.$el.html(_.template(LoginTemplate, this.stateModel.toJSON()));
            return this;
        },

        login: function (event) {
            event.stopImmediatePropagation();
            //consle.log('login');
            var self = this;
            var errors = [];
            var messages = [];
            var stateModelUpdate = {
                errors: false,
                messages: false,
                email: this.$el.find("#email").val().trim(),
                password: this.$el.find("#password").val().trim()
            };

            event.preventDefault();

            this.stateModel.set(stateModelUpdate);

            if (!stateModelUpdate.email || !validation.validEmail(stateModelUpdate.email)) {
                messages.push('Email is invalid');
            }
            if (stateModelUpdate.password.length < 4) {
                messages.push('Password must be longer than 3 characters');
            }
            if (errors.length > 0 || messages.length > 0) {
                if (errors.length > 0) {
                    stateModelUpdate.errors = errors;
                }
                if (messages.length > 0) {
                    stateModelUpdate.messages = messages;
                }
                this.stateModel.set(stateModelUpdate);
                return this;
            }
            $.ajax({
                url: "/signIn",
                type: "POST",
                dataType: 'json',
                data: {
                    email: stateModelUpdate.email,
                    pass: stateModelUpdate.password
                },
                success: function (response) {
                    self.stateModel.set({
                        password: '',
                        errors: false,
                        messages: false,
                        email: ''
                    });
                    App.sessionData.set({
                        authorized: true,
                        admin: false,
                        user: response.user
                    });
                    App.router.navigate("main", {trigger: true});
                },
                error: function (err) {
                    App.sessionData.set({
                        authorized: false,
                        admin: false,
                        user: null
                    });
                    App.error(err);
                    console.log(err);
                    self.stateModel.set({
                        errors: [err.responseJSON.error],
                        password: null
                    });
                }
            });
            return this;
        }
    });

    return LoginView;

});
