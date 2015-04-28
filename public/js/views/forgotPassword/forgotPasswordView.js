define([
    'text!templates/forgotPassword/forgotPasswordTemplate.html',
    'custom',
    'validation',
    'communication'
], function (template, Custom, validation, Communication) {

    var forgotPasswordView = Backbone.View.extend({
        //el: '#wrapper',
        initialize: function (options) {
            this.listenTo(this.stateModel, 'change', this.render);
            this.render();
        },

        stateModel: new Backbone.Model({
            email: '',
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
                email: this.$el.find("#email").val().trim()
            };

            event.preventDefault();

            this.stateModel.set(stateModelUpdate);

            if (!stateModelUpdate.email || !validation.validEmail(stateModelUpdate.email)) {
                messages.push('Email is invalid');
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
                url: "/forgotPassword",
                type: "POST",
                data: {
                    login: stateModelUpdate.login
                },
                success: function (response) {
                    // TODO
                    Custom.runApplication(true);
                },
                error: function () {
                    self.stateModel.set({
                        errors: ["Such user doesn't registered"]
                    });
                }
            });
            return this;
        }
    });

    return forgotPasswordView;

});
