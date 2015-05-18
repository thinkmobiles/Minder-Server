define([
    'router',
    'text!templates/resetPassword/resetPasswordTemplate.html',
    'custom',
    'validation'
], function (router, template, Custom, validation) {

    var View;
    View = Backbone.View.extend({

        initialize: function () {
            this.setDefaultStateModel();
            this.listenTo(this.stateModel, 'change', this.render);
            this.render();
        },

        events: {
            "submit #resetPasswordForm": "resetPassword",
            "click .resetPasswordFormSubmit": "resetPassword"
        },

        setDefaultStateModel: function () {
            var defaultData = {
                newPassword: '',
                confirmPassword: '',
                errors: false,
                messages: false
            };

            if (this.stateModel) {
                this.stateModel.set(defaultData);
            } else {
                this.stateModel = new Backbone.Model(defaultData);
            }
        },

        afterUpend: function () {
            this.setDefaultStateModel();
        },

        setParams: function (params) {
            this.stateModel.set({
                token: params.token
            });
        },

        resetPassword: function (event) {
            event.preventDefault();

            var self = this;
            var errors = [];
            var messages = [];

            var stateModelUpdate = {
                errors: false,
                messages: false,
                newPassword: this.$el.find("#newPassword").val().trim(),
                confirmPassword: this.$el.find("#confirmPassword").val().trim()
            };

            this.stateModel.set(stateModelUpdate);

            // validations
            validation.checkPasswordField(messages, true, stateModelUpdate.newPassword, 'New password');
            validation.checkPasswordField(messages, true, stateModelUpdate.confirmPassword, 'Confirm password');

            if (stateModelUpdate.newPassword !== stateModelUpdate.confirmPassword) {
                messages.push('New password is not equal to confirm password');
            }

            if (errors.length > 0 || messages.length > 0) {
                if (errors.length > 0) {
                    stateModelUpdate.errors = errors;
                }
                if (messages.length > 0) {
                    stateModelUpdate.messages = messages;
                }
                this.stateModel.set(stateModelUpdate);

                // if errors prevent request
                return this;
            }
            $.ajax({
                url: "/resetPassword",
                type: "POST",
                data: {
                    token: self.stateModel.get('token'),
                    password: stateModelUpdate.newPassword
                },
                success: function () {
                    self.setDefaultStateModel();
                    App.router.navigate("login", {
                        trigger: true
                    });
                },
                error: function (err) {
                    App.error(err);
                    self.setDefaultStateModel();
                }
            });
            return this;
        },

        render: function () {
            var data = this.stateModel.toJSON();
            this.$el.html(_.template(template, data));
            return this;
        }
    });

    return View;

});
