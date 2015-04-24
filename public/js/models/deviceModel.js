define(['validation'], function (validation) {
    var Model = Backbone.Model.extend({
        idAttribute: "_id",
        url: function () {
            return "/devices/" + this.get('_id');
            //return this.get('id');
        },
        //defaults: {
        //    user: {type: ObjectId, ref: 'Users'},
        //    minderId: {type: String, required: true, unique: true},
        //    deviceId: {type: String, required: true, unique: true},
        //    deviceType: {type: String, required: true},
        //    name: {type: String, default: ''},
        //    enabledTrackLocation: {type: Boolean, required: true, default: false},
        //    isPayed: {type: Boolean, required: true, default: false},
        //    lastLocation: {
        //        long: {type: Number, required: true},
        //        lat: {type: Number, required: true},
        //        accuracy: {type: Number},  // meters
        //        dateTime: {type: Date, default: Date.now}
        //    },
        //    createdAt: {type: Date, default: Date.now},
        //    updatedAt: {type: Date, default: Date.now}
        //},

        initialize: function () {
            this.on('invalid', function (model, errors) {
                if (errors.length > 0) {
                    var msg = errors.join('\n');
                    alert(msg);
                }
            });
        },
        //toJSON: function (data, data2) {
        //    var jsonData = _.clone(this.attributes);
        //    console.log('??', jsonData, this.attributes);
        //    if (jsonData.checked !== undefined) {
        //        delete jsonData.checked;
        //    }
        //    console.log('??-', jsonData, this.attributes);
        //    return jsonData;
        //},

        validate: function (attrs, options) {
            var errors = [];

            validation.checkNameField(errors, true, attrs.name, 'Name');

            //if (options.editMode == false) {
            //    Validation.checkLoginField(errors, true, attrs.login, "Login");
            //    Validation.checkEmailField(errors, false, attrs.email, "Email");
            //    Validation.checkPasswordField(errors, true, attrs.pass, "Password");
            //    Validation.checkPasswordField(errors, true, options.confirmPass, "Confirm password");
            //    Validation.checkPasswordField(errors, true, attrs.oldpass, "Old password");
            //    Validation.comparePasswords(errors, attrs.pass, options.confirmPass);
            //}
            //else if (options.editMode == true) {
            //    Validation.checkLoginField(errors, true, attrs.login, "Login");
            //    Validation.checkEmailField(errors, false, attrs.email, "Email");
            //}
            //else {
            //    Validation.checkLoginField(errors, true, attrs.login, "Login");
            //    Validation.checkEmailField(errors, false, attrs.email, "Email");
            //    Validation.checkPasswordField(errors, true, attrs.pass, "Password");
            //    Validation.checkPasswordField(errors, true, options.confirmPass, "Confirm password");
            //    Validation.comparePasswords(errors, attrs.pass, options.confirmPass);
            //}

            if (errors.length > 0)
                return errors;
        },
        //urlRoot: function () {
        //    //return "/device/" + this.get('_id');
        //    return this.get('id');
        //}
    });
    return Model;
});