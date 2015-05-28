define([
    'router',
    'text!templates/profile/profileTemplate.html',
    'custom',
    'validation'
], function (router, template, Custom, validation) {

    var View;
    View = Backbone.View.extend({

        initialize: function () {
            var self = this;

            this.setDefaultStateModel();

            this.listenTo(this.stateModel, 'change', function () {
                self.render();
            });
            self.render();
        },

        events: {
            "submit #profileEditForm": "changeProfile",
            "click .profileFormSubmit": "changeProfile"
        },

        // set default data
        setDefaultStateModel: function () {
            var user = App.sessionData.toJSON().user;

            var defaultData = {
                email: user.email || '',
                password: '',
                newPassword: '',
                confirmPassword: '',
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                errors: false,
                messages: false,
                errObj:false
            };

            if (this.stateModel) {
                this.stateModel.set(defaultData);
            } else {
                this.stateModel = new Backbone.Model(defaultData);
            }
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
            var errObj = {};
            var data;

            var stateModelUpdate = {
                errors: false,
                messages: false,
                errObj: false,
                email: this.$el.find("#email").val().trim(),
                firstName: this.$el.find("#firstName").val().trim(),
                lastName: this.$el.find("#lastName").val().trim(),
                password: this.$el.find("#password").val().trim(),
                newPassword: this.$el.find("#newPassword").val().trim(),
                confirmPassword: this.$el.find("#confirmPassword").val().trim()
            };

            // update state data
            this.stateModel.set(stateModelUpdate);

            // validations
            validation.checkEmailField(messages, true, stateModelUpdate.email, 'Email');
            validation.checkNameField(errObj, true, stateModelUpdate.firstName, 'First name');
            validation.checkNameField(errObj, true, stateModelUpdate.lastName, 'Last name');
            if (stateModelUpdate.newPassword || stateModelUpdate.password) {
                // if need validate passwords
                validation.checkPasswordField(errObj, true, stateModelUpdate.password, 'Password');
                validation.checkPasswordField(errObj, true, stateModelUpdate.newPassword, 'New password');
                validation.checkPasswordField(errObj, true, stateModelUpdate.confirmPassword, 'Confirm password');
                if (stateModelUpdate.newPassword !== stateModelUpdate.confirmPassword) {
                    messages.push('New password is not equal to confirm password');
                }
            }

            for (var my in errObj){
                if(errObj[my].length>0) {
                    messages.push(errObj[my]);
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

                // if errors prevent request
                return this;
            }

            data = {
                email: stateModelUpdate.email,
                password: stateModelUpdate.password,
                firstName: stateModelUpdate.firstName,
                lastName: stateModelUpdate.lastName
            };

            if (stateModelUpdate.newPassword) {
                data.newPassword = stateModelUpdate.newPassword;
            }

            $.ajax({
                url: "/profile",
                type: "PUT",
                data: data,
                success: function (response) {
                    self.stateModel.set({
                        password: '',
                        newPassword: '',
                        confirmPassword: '',
                        errors: false,
                        messages: false
                    });

                    alert('Profile updated successfully');

                    App.updateUser();

                    App.router.navigate("main", {trigger: true});
                },
                error: function (err) {
                    //App.error(err);

                    self.stateModel.set({
                        errors: [err.responseJSON.error],
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
