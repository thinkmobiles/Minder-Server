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

            this.listenTo(this.stateModel, 'change:errors change:messages change:errObj', this.render);

            this.render();
        },


        events: {
            "submit #loginForm"     : "signUp",
            "click .signUpButton"   : "signUp",
            "focusin .form-control" : "clearField",
            "click #captcha"        : "clearField",
            "click .customCheckbox" : "clearField"
        },

        clearField: function (event){
            var target = $(event.target);
            var closEl = target.closest('.form-group');
            closEl.find('.alert-danger').remove();
        },

        clearCaptchaField: function(event){
            var container = this.$el.find('.captcha');
            container.find('.alert-danger').remove();
        },

        setDefaultData: function () {
            var defaultData = {
                email             : '',
                password          : '',
                confirmPassword   : '',
                firstName         : '',
                lastName          : '',
                iAcceptConditions : false,
                errors            : false,
                messages          : false,
                errObj            : false
            };
            if (this.stateModel) {
                this.stateModel.set(defaultData);
            } else {
                this.stateModel = new Backbone.Model(defaultData);
            }
        },

        afterUpend: function () {
            this.setDefaultData();
            this.render();
        },

        signUp: function (event) {
            event.preventDefault();

            var self = this;
            var errCount=0;

            var errors = [];
            var messages = [];
            var errObj = {
                email      :[],
                condAndTerm:[],
                captcha    :[]
            };

            var captchaData;

            captchaData = {
                challenge : Recaptcha.get_challenge(),
                response  : Recaptcha.get_response()
            };

            var stateModelUpdate = {
                errors         : false,
                messages       : false,
                errObj         : false,
                email          : this.$el.find("#email").val().trim(),
                firstName      : this.$el.find("#firstName").val().trim(),
                lastName       : this.$el.find("#lastName").val().trim(),
                password       : this.$el.find("#password").val().trim(),
                confirmPassword: this.$el.find("#confirmPassword").val().trim(),
                iAcceptConditions: this.$el.find("#iAcceptConditions").prop('checked')
            };


            this.stateModel.set(stateModelUpdate);

            if (!stateModelUpdate.email || !validation.validEmail(stateModelUpdate.email)) {
                errObj.email.push('Password is not equal to confirm password');
            }

            validation.checkNameField(errObj, true, stateModelUpdate.firstName, 'firstName');
            validation.checkNameField(errObj, true, stateModelUpdate.lastName, 'lastName');
            validation.checkPasswordField(errObj, true, stateModelUpdate.password, 'password');
            validation.checkPasswordField(errObj, true, stateModelUpdate.confirmPassword, 'confirmPassword');

            if (stateModelUpdate.password !== stateModelUpdate.confirmPassword) {
                errObj.confirmPassword.push('Password is not equal to confirm password');
            }

            if (!stateModelUpdate.iAcceptConditions) {
                errObj.condAndTerm.push('Terms and conditions is not checked');
            }

            if (!captchaData || captchaData.response === '') {
                errObj.captcha.push('please check reCAPTCHA');
            }


            for (var my in errObj){
                errCount += errObj[my].length;
            }

            if (errors.length > 0 || messages.length > 0 || errCount>0) {
                if (errors.length > 0) {
                    stateModelUpdate.errors = errors;
                }
                if (messages.length > 0) {
                    stateModelUpdate.messages = messages;
                }
                if (errCount > 0) {
                    stateModelUpdate.errObj = errObj;
                }
                this.stateModel.set(stateModelUpdate);
                return this;
            }
            $.ajax({
                url  : "/signUp",
                type : "POST",
                data : {
                    email     : stateModelUpdate.email,
                    pass      : stateModelUpdate.password,
                    firstName : stateModelUpdate.firstName,
                    lastName  : stateModelUpdate.lastName,
                    captchaChallenge: captchaData.challenge,
                    captchaResponse : captchaData.response
                },
                success: function () {
                    self.stateModel.set({
                        password       : '',
                        confirmPassword: '',
                        email          : '',
                        firstName      : '',
                        lastName       : '',
                        iAcceptConditions: false
                    });
                    App.router.navigate("confirm", {trigger: true});
                },
                error: function (err) {
                    //App.error(err);
                    self.stateModel.set({
                        errors     : [err.responseJSON.error],
                        password   : null,
                        confirmPassword: null
                    });

                }
            });
            return this;
        },

        render: function () {
            this.$el.html(_.template(template, this.stateModel.toJSON()));

            Recaptcha.create(config.recaptchaSiteKey, 'captcha', {
                tabindex : 4,
                theme    : "clean"
            });

            return this;
        }
    });

    return View;

});
