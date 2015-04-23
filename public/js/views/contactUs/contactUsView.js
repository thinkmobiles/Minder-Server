define([
    'text!templates/contactUs/contactUsTemplate.html',
    'views/contactMap/contactMapView',
    'custom',
    'validation'
], function (template, ContactMap, Custom, validation) {

    var View = Backbone.View.extend({
        //el: '#wrapper',
        initialize: function () {
            this.listenTo(this.stateModel, 'change', this.render);
            this.render();
            this.contactMap = new ContactMap({
                $domElement: this.$el.find('#contactMap'),
                //lat: 144.96072129999993,
                //lng: -37.8180688
                address: '10/50 Market St Melbourne VIC 3000 Australia'
            });
        },

        stateModel: new Backbone.Model({
            errors: false,
            messages: false,
            email: '',
            name: '',
            phone: '',
            query: '',
            contactType: '',
            contactTypes: [
                {
                    name: '',
                    value: '?'
                }, {
                    name: 'Yes, by SMS and email',
                    value: 'sms,email'
                }, {
                    name: 'Yes, by SMS only',
                    value: 'sms'
                }, {
                    name: 'Yes, by email only',
                    value: 'email'
                }, {
                    name: 'No, not interested',
                    value: 'no'
                }
            ]
        }),

        events: {
            "submit #contactUsForm": "contactUs",
            "click .contactUsButton": "contactUs"
        },

        render: function () {
            this.$el.html(_.template(template, this.stateModel.toJSON()));
            return this;
        },

        contactUs: function (event) {
            var self = this;
            var errors = [];
            var messages = [];
            var stateModelUpdate = {
                errors: false,
                messages: false,
                email: this.$el.find("#email").val().trim(),
                name: this.$el.find("#name").val().trim(),
                phone: this.$el.find("#phone").val().trim(),
                contactType: this.$el.find("#contactType").val().trim(),
                query: this.$el.find("#query").val().trim()
            };

            event.preventDefault();

            this.stateModel.set(stateModelUpdate);


            validation.checkEmailField(messages, true, stateModelUpdate.email, 'Email');
            validation.checkNameField(messages, true, stateModelUpdate.name, 'Name');
            validation.checkPhoneField(messages, true, stateModelUpdate.phone, 'Phone');

            if (stateModelUpdate.contactType === "?") {
                messages.push('Please select contact type');
            }

            if (stateModelUpdate.query.length < 10) {
                messages.push('Query is to short or empty');
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
                url: "/contactUs",
                type: "POST",
                data: {
                    email: stateModelUpdate.email,
                    password: stateModelUpdate.password
                },
                success: function (response) {
                    // TODO
                    self.stateModel.set({
                        errors: false,
                        messages: false,
                        email: '',
                        name: '',
                        phone: '',
                        contactType: '',
                        query: ''
                    });
                    router.navigate("login", {trigger: true});
                },
                error: function () {
                    // TODO
                    self.stateModel.set({
                        errors: ["Such user doesn't registered"],
                        password: null
                    });
                }
            });
            return this;
        }
    });

    return View;

});
