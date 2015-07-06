'use strict';

module.exports = (function () {
    var CONSTANTS = require('../constants/index');
    var USER_ROLES = require('../constants/userRoles');
    var NAME_MIN_LENGTH = CONSTANTS.USERNAME_MIN_LENGTH;
    var NAME_MAX_LENGTH = CONSTANTS.USERNAME_MAX_LENGTH;

    var mongoose = require('mongoose');
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var userSchema = mongoose.Schema({
        minderId: {type: String, required: true, unique: true},
        email: {type: String, require: true, unique: true},
        pass: {type: String},
        confirmToken: {type: String},
        forgotToken: {type: String},
        firstName: {type: String, minlength: NAME_MIN_LENGTH, maxlength: NAME_MAX_LENGTH},
        lastName: {type: String, minlength: NAME_MIN_LENGTH, maxlength: NAME_MAX_LENGTH},
        role: {type: Number, required: true, default: USER_ROLES.USER},
        billings: {
            currentPlan: {type: ObjectId, ref: 'TariffPlans', default: null},
            planPeriod:{type: String, minlength: 4, maxlength: 5, default: 'month'},
            stripeId: {type: String, default: null},
            renewEnabled: {type: Boolean, default: false},
            subscribedDevices: {type: Number, required: true, default: 0}
        },
        devices: [{ type: ObjectId, ref: 'Device' }],
        createdAt: {type: Date, default: Date.now},
        updatedAt: {type: Date, default: Date.now}
    }, {collection: 'Users'});

    mongoose.model('User', userSchema);

    if (!mongoose.Schemas) {
        mongoose.Schemas = {};
    }

    mongoose.Schemas['User'] = userSchema;

    if (process.env.NODE_ENV !== 'production') {
        userSchema.set('autoIndex', false);
    }

})();