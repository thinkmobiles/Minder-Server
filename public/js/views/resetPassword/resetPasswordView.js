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
            this.stateModel = new Backbone.Model({
                password: '',
                newPassword: '',
                confirmPassword: '',
                errors: false,
                messages: false
            })
        },

        render: function () {
            var data = App.sessionData.toJSON().user;
            data = _.extend(data, this.stateModel.toJSON());
            this.$el.html(_.template(template, data));
            return this;
        },

        afterUpend: function () {
            this.stateModel.set({
                password: '',
                newPassword: '',
                confirmPassword: '',
                errors: false,
                messages: false
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
                password: this.$el.find("#password").val().trim(),
                newPassword: this.$el.find("#newPassword").val().trim(),
                confirmPassword: this.$el.find("#confirmPassword").val().trim()
            };

            this.stateModel.set(stateModelUpdate);

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
                return this;
            }
            $.ajax({
                url: "/resetPassword",
                type: "POST",
                data: {
                    password: stateModelUpdate.newPassword
                },
                success: function () {
                    self.stateModel.set({
                        password: '',
                        newPassword: '',
                        confirmPassword: '',
                        errors: false,
                        messages: false
                    });

                    alert('Password updated successfully');

                    App.router.navigate("login", {
                        trigger: true
                    });
                },
                error: function (err) {
                    App.error(err);
                    self.stateModel.set({
                        password: '',
                        confirmPassword: '',
                        newPassword: ''
                    });
                }
            });
            return this;
        }
    });

    return View;

});
