define([
    'router',
    'text!templates/profile/profileTemplate.html',
    'custom',
    'validation'
], function (router, template, Custom, validation) {

    var View = Backbone.View.extend({
        //el: '#wrapper',
        initialize: function (options) {
            this.setDefaultStateModel();
            this.listenTo(this.stateModel, 'change', this.render);
            this.render();
        },


        events: {
            "submit #profileForm": "changeProfile",
            "click .profileFormSubmit": "changeProfile"
        },

        setDefaultStateModel: function () {
            var user = App.sessionData.toJSON().user;
            this.stateModel = new Backbone.Model({
                email: user.email || '',
                password: '',
                newPassword: '',
                confirmPassword: '',
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                errors: false,
                messages: false
            })
        },

        render: function (options) {
            var data = App.sessionData.toJSON().user;
            data = _.extend(data, this.stateModel.toJSON());
            console.log('profile Data', data);
            this.$el.html(_.template(template, data));
            return this;
        },

        afterUpend: function () {

        },

        changeProfile: function (event) {
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
                newPassword: this.$el.find("#newPassword").val().trim(),
                confirmPassword: this.$el.find("#confirmPassword").val().trim()
            };

            event.preventDefault();

            this.stateModel.set(stateModelUpdate);

            validation.checkEmailField(messages, true, stateModelUpdate.email, 'Email');
            validation.checkNameField(messages, true, stateModelUpdate.firstName, 'First name');
            validation.checkNameField(messages, true, stateModelUpdate.lastName, 'Last name');
            validation.checkPasswordField(messages, true, stateModelUpdate.password, 'Password');
            validation.checkPasswordField(messages, true, stateModelUpdate.newPassword, 'New password');
            validation.checkPasswordField(messages, true, stateModelUpdate.confirmPassword, 'Confirm password');

            if (stateModelUpdate.newPassword !== stateModelUpdate.confirmPassword) {
                messages.push('New password is not equal to confirm password');
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
                        email: '',
                        password: '',
                        newPassword: '',
                        confirmPassword: '',
                        firstName: '',
                        lastName: '',
                        iAcceptConditions: false,
                        errors: false,
                        messages: false
                    });
                    router.navigate("main", {trigger: true});
                },
                error: function () {
                    // TODO
                    self.stateModel.set({
                        errors: ["Error"],
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
