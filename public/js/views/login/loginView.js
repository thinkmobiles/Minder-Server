define([
    'text!templates/login/LoginTemplate.html',
    'custom',
    'validation',
    'communication'
], function (LoginTemplate, Custom, validation, Communication) {

    var LoginView = Backbone.View.extend({
        el: '#wrapper',
        initialize: function (options) {
            //if (options && options.dbs) {
            //    this.render(options);
            //} else {
            //    this.render();
            //}
            this.listenTo(this.stateModel, 'change', this.render);
            this.render();
        },

        stateModel: new Backbone.Model({
            email: '',
            password: '',
            errors: false,
            messages: false
        }),

        events: {
            "submit #loginForm": "login",
            "click .login-button": "login",
            //"click .remember-me": "checkClick"
        },

        render: function (options) {
            this.$el.html(_.template(LoginTemplate, this.stateModel.toJSON()));
            return this;
        },

        //checkClick: function (event) {
        //    this.$el.find(".remember-me").toggleClass("active");
        //    if (this.$el.find("#urem").attr("checked")) {
        //        this.$el.find("#urem").removeAttr("checked");
        //    } else {
        //        this.$el.find("#urem").attr("checked", "checked");
        //    }
        //},

        login: function (event) {
            var self = this;
            var errors = [];
            var messages = [];
            var stateModelUpdate = {
                errors: false,
                messages: false,
                email: this.$el.find("#email").val().trim(),
                password: this.$el.find("#password").val().trim()
            };

            event.preventDefault();

            this.stateModel.set(stateModelUpdate);

            if (!stateModelUpdate.email || !validation.validEmail(stateModelUpdate.email)) {
                messages.push('Email is invalid');
            }
            if (stateModelUpdate.password.length < 4) {
                messages.push('Password must be longer than 3 characters');
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
                url: "/login",
                type: "POST",
                data: {
                    email: stateModelUpdate.email,
                    password: stateModelUpdate.password
                },
                success: function (response) {
                    // TODO
                    self.stateModel.set({
                        password: null
                    });
                    router.navigate("login", {trigger: true});
                },
                error: function () {
                    self.stateModel.set({
                        errors: ["Such user doesn't registered"],
                        password: null
                    });
                }
            });
            return this;
        }
    });

    return LoginView;

});
