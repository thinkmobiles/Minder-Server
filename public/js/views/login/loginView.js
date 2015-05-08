define([
    'text!templates/login/LoginTemplate.html',
    'custom',
    'validation'
], function (LoginTemplate, Custom, validation) {

    var View;
    View = Backbone.View.extend({

        initialize: function () {
            this.stateModel = new Backbone.Model({
                rememberMe:false,
                email: '',
                password: '',
                errors: false,
                messages: false
            });

            // keep data actual
            this.listenTo(this.stateModel, 'change', this.render);

            this.render();
        },

        events: {
            "submit #loginForm": "login",
            "click .login-button": "login"
        },

        render: function () {
            this.$el.html(_.template(LoginTemplate, this.stateModel.toJSON()));
            return this;
        },

        login: function (event) {
            event.stopImmediatePropagation();
            event.preventDefault();

            var self = this;
            var errors = [];
            var messages = [];
            var stateModelUpdate = {
                errors: false,
                messages: false,
                email: this.$el.find("#email").val().trim(),
                password: this.$el.find("#password").val().trim(),
                rememberMe: this.$el.find('#rememberMe').prop('checked')
            };

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
                    pass: stateModelUpdate.password,
                    rememberMe : stateModelUpdate.rememberMe
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

                    self.stateModel.set({
                        errors: [err.responseJSON.error],
                        password: null
                    });
                }
            });
            return this;
        }
    });

    return View;

});
