define([
    'router',
    'text!templates/signUp/signUpTemplate.html',
    'custom',
    'validation'
], function (router, template, Custom, validation) {

    var View = Backbone.View.extend({
        el: '#wrapper',
        initialize: function (options) {
            this.listenTo(this.stateModel, 'change', this.render);
            this.render();
        },

        stateModel: new Backbone.Model({
            email: '',
            password: '',
            confirmPassword: '',
            firstName: '',
            lastName: '',
            iAcceptConditions: false,
            errors: false,
            messages: false
        }),

        events: {
            "submit #loginForm": "sendMail",
            "click .sendMailButton": "sendMail"
        },

        render: function (options) {
            this.$el.html(_.template(template, this.stateModel.toJSON()));
            return this;
        },

        sendMail: function (event) {
            var self = this;
            var errors = [];
            var messages = [];
            var stateModelUpdate = {
                errors: false,
                messages: false,
                email: this.$el.find("#email").val().trim(),
                firstName: this.$el.find("#firstName").val().trim(),
                lastName: this.$el.find("#lastName").val().trim(),
                password: this.$el.find("#password").val().trim(),
                confirmPassword: this.$el.find("#confirmPassword").val().trim(),
                iAcceptConditions: this.$el.find("#iAcceptConditions").prop('checked')
            };

            event.preventDefault();

            this.stateModel.set(stateModelUpdate);

            if (!stateModelUpdate.email || !validation.validEmail(stateModelUpdate.email)) {
                messages.push('Email is invalid');
            }

            validation.checkNameField(messages, true, stateModelUpdate.firstName, 'First name');
            validation.checkNameField(messages, true, stateModelUpdate.lastName, 'Last name');
            validation.checkPasswordField(messages, true, stateModelUpdate.password, 'Password');
            validation.checkPasswordField(messages, true, stateModelUpdate.confirmPassword, 'Confirm password');

            if (stateModelUpdate.password !== stateModelUpdate.confirmPassword) {
                messages.push('Password is not equal to confirm password');
            }

            if (!stateModelUpdate.iAcceptConditions) {
                messages.push('terms and conditions is not checked');
            }

            console.log(this.stateModel.toJSON());
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
                url: "/signUp",
                type: "POST",
                data: {
                    email: stateModelUpdate.email,
                    password: stateModelUpdate.password,
                    firstName: stateModelUpdate.firstName,
                    lastName: stateModelUpdate.lastName
                },
                success: function (response) {
                    self.stateModel.set({
                        password: null,
                        confirmPassword: null
                    });
                    router.navigate("login", {trigger: true});
                },
                error: function () {
                    // TODO
                    self.stateModel.set({
                        errors: ["Error"],
                        password: null,
                        confirmPassword: null
                    });
                }
            });
            return this;
        }
    });

    return View;

});
