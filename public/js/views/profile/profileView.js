define([
    'router',
    'text!templates/profile/profileTemplate.html',
    'custom',
    'validation'
], function (router,
             template,
             Custom,
             validation) {

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
            "click .profileFormSubmit": "changeProfile",
            "focusin .form-control": "clearField"
        },

        setDefaultStateModel: function () {
            var user = App.sessionData.toJSON().user;

            var defaultData = {
                email          : user.email || '',
                password       : '',
                newPassword    : '',
                confirmPassword: '',
                firstName      : user.firstName || '',
                lastName       : user.lastName || '',
                errors         : false,
                messages       : false,
                errObj         : false
            };

            if (this.stateModel) {
                this.stateModel.set(defaultData);
            } else {
                this.stateModel = new Backbone.Model(defaultData);
            }
        },

        clearField: function (event){
            var target = $(event.target);
            var closEl = target.closest('.form-group');
            closEl.find('.alert-danger').remove();
        },

        afterUpend: function () {
            this.setDefaultStateModel();
        },

        changeProfile: function (event) {
            event.preventDefault();

            var self   = this;
            var errors = [];
            var messages = [];
            var errObj  = {};
            var errCount=0;
            var data;

            var stateModelUpdate = {
                errors         : false,
                messages       : false,
                errObj         : false,
                email          : this.$el.find("#email").val().trim(),
                firstName      : this.$el.find("#firstName").val().trim(),
                lastName       : this.$el.find("#lastName").val().trim(),
                password       : this.$el.find("#password").val().trim(),
                newPassword    : this.$el.find("#newPassword").val().trim(),
                confirmPassword: this.$el.find("#confirmPassword").val().trim()
            };

            this.stateModel.set(stateModelUpdate);

            validation.checkEmailField(errObj, true, stateModelUpdate.email, 'email');
            validation.checkNameField(errObj, true, stateModelUpdate.firstName, 'firstName');
            validation.checkNameField(errObj, true, stateModelUpdate.lastName, 'lastName');
            if (stateModelUpdate.newPassword || stateModelUpdate.password) {
                validation.checkPasswordField(errObj, true, stateModelUpdate.password, 'password');
                validation.checkPasswordField(errObj, true, stateModelUpdate.newPassword, 'newPassword');
                validation.checkPasswordField(errObj, true, stateModelUpdate.confirmPassword, 'confirmPassword');
                if (stateModelUpdate.newPassword !== stateModelUpdate.confirmPassword) {
                    errObj.confirmPassword.push('New password is not equal to confirm password');
                }
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

            data = {
                email     : stateModelUpdate.email,
                password  : stateModelUpdate.password,
                firstName : stateModelUpdate.firstName,
                lastName  : stateModelUpdate.lastName
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
                        password       : '',
                        newPassword    : '',
                        confirmPassword: '',
                        errors         : false,
                        messages       : false,
                        errObj         : false
                    });

                    alert('Profile updated successfully');

                    App.updateUser();

                    App.router.navigate("main", {trigger: true});
                },
                error: function (err) {

                    self.stateModel.set({
                        errors         : [err.responseJSON.error],
                        password       : '',
                        confirmPassword: '',
                        newPassword    : ''
                    });
                }
            });

            return this;
        },

        render: function () {
            var data = App.sessionData.toJSON().user;

            data = _.extend(data, this.stateModel.toJSON());

            this.$el.html(_.template(template, data));

            return this;
        }
    });

    return View;

});
