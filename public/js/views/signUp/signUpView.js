define([
    'router',
    'text!templates/signUp/signUpTemplate.html',
    'custom',
    'validation',
    'config/config',
    'recaptcha'
], function (router, template, Custom, validation, config, Recaptcha) {

    var View;
    View = Backbone.View.extend({
        initialize: function () {

            this.setDefaultData();

            this.listenTo(this.stateModel, 'change:errors change:messages', this.render);

            this.render();
        },


        events: {
            "submit #loginForm": "signUp",
            "click .signUpButton": "signUp"
        },

        //reset the data
        setDefaultData: function () {
            var defaultData = {
                email: '',
                password: '',
                confirmPassword: '',
                firstName: '',
                lastName: '',
                iAcceptConditions: false,
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
            //update page when reopened
            this.setDefaultData();
            this.render();
        },

        signUp: function (event) {
            event.preventDefault();

            var self = this;

            var errors = [];
            var messages = [];
            var captchaData;

            captchaData = {
                challenge: Recaptcha.get_challenge(),
                response: Recaptcha.get_response()
            };

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

            if (!captchaData || captchaData === '') {
                messages.push('please check reCAPTCHA');
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
                url: "/signUp",
                type: "POST",
                data: {
                    email: stateModelUpdate.email,
                    pass: stateModelUpdate.password,
                    firstName: stateModelUpdate.firstName,
                    lastName: stateModelUpdate.lastName,
                    captchaChallenge: captchaData.challenge,
                    captchaResponse: captchaData.response
                },
                success: function () {
                    self.stateModel.set({
                        password: '',
                        confirmPassword: '',
                        email: '',
                        firstName: '',
                        lastName: '',
                        iAcceptConditions: false
                    });
                    App.router.navigate("login", {trigger: true});
                },
                error: function (err) {
                    App.error(err);
                    self.stateModel.set({
                        errors: ["Error"],
                        password: null,
                        confirmPassword: null
                    });
                }
            });
            return this;
        },

        render: function () {
            this.$el.html(_.template(template, this.stateModel.toJSON()));

            Recaptcha.create(config.recaptchaSyteKay, 'captcha', {
                tabindex: 4,
                theme: "clean"
            });

            return this;
        }
    });

    return View;

});
