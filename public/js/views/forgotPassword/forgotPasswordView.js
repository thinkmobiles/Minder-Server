define([
    'text!templates/forgotPassword/forgotPasswordTemplate.html',
    'custom',
    'validation'
], function (template, Custom, validation) {

    var View;

    View = Backbone.View.extend({
        initialize: function () {

            this.stateModel = new Backbone.Model({
                email: '',
                errors: false,
                messages: false
            });

            // keep data actual
            this.listenTo(this.stateModel, 'change', this.render);

            this.render();
        },

        events: {
            "submit #sendMailForm": "sendMail",
            "click .sendMailButton": "sendMail"
        },

        sendMail: function (event) {
            event.preventDefault();

            var self = this;

            // messages for user
            var errors = [];
            var messages = [];

            // delete previous messages
            // and get actual data
            var stateModelUpdate = {
                errors: false,
                messages: false,
                email: this.$el.find("#email").val().trim()
            };

            this.stateModel.set(stateModelUpdate);

            // stack of validations ...
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

            // if ok send query
            $.ajax({
                url: "/forgotPassword",
                type: "POST",
                data: {
                    login: stateModelUpdate.login
                },
                success: function () {
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
        },

        render: function () {
            this.$el.html(_.template(template, this.stateModel.toJSON()));

            return this;
        }
    });

    return View;

});
