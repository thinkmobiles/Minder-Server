define([
    'router',
    'text!templates/profile/profileTemplate.html',
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
            "submit #profileEditForm": "changeProfile",
            "click .profileFormSubmit": "changeProfile"
        },

        // set default data
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

        // set default data when reopen the page
        afterUpend: function () {
            this.setDefaultStateModel();
        },

        // validate and snd set data on server
        changeProfile: function (event) {
            event.preventDefault();

            var self = this;
            var errors = [];
            var messages = [];
            var data;

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

            this.stateModel.set(stateModelUpdate);

            validation.checkEmailField(messages, true, stateModelUpdate.email, 'Email');
            validation.checkNameField(messages, true, stateModelUpdate.firstName, 'First name');
            validation.checkNameField(messages, true, stateModelUpdate.lastName, 'Last name');
            if(stateModelUpdate.newPassword || stateModelUpdate.password){
                validation.checkPasswordField(messages, true, stateModelUpdate.password, 'Password');
                validation.checkPasswordField(messages, true, stateModelUpdate.newPassword, 'New password');
                validation.checkPasswordField(messages, true, stateModelUpdate.confirmPassword, 'Confirm password');
                if (stateModelUpdate.newPassword !== stateModelUpdate.confirmPassword) {
                    messages.push('New password is not equal to confirm password');
                }
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

            data = {
                email: stateModelUpdate.email,
                password: stateModelUpdate.password,
                firstName: stateModelUpdate.firstName,
                lastName: stateModelUpdate.lastName
            };

            if(stateModelUpdate.newPasswor){
                data.newPasswor = stateModelUpdate.newPasswor;
            }

            $.ajax({
                url: "/profile",
                type: "PUT",
                data:data,
                success: function (response) {
                    self.stateModel.set({
                        password: '',
                        newPassword: '',
                        confirmPassword: '',
                        errors: false,
                        messages: false
                    });
                    alert('Profile updated successfully');
                    App.router.navigate("main", {trigger: true});
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
        },

        render: function () {
            var data = App.sessionData.toJSON().user;

            // concat user old and new data
            data = _.extend(data, this.stateModel.toJSON());

            this.$el.html(_.template(template, data));

            return this;
        }
    });

    return View;

});
