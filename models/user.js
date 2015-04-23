'use strict';

module.exports = (function () {
    var USER_ROLES = require('../constants/userRoles');
    var mongoose = require('mongoose');
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var userSchema = mongoose.Schema({
        minderId: {type: String, required: true, unique: true},
        email: {type: String, require: true, unique: true},
        pass: {type: String},
        confirmToken: {type: String},
        forgotToken: {type: String},
        firstName: {type: String, default: ''},
        lastName: {type: String, default: ''},
        status: {type: Number, default: 0}, // 0 - inactive ??? CMS buttons Activate | Edit | Delete ???
        role: {type: Number, required: true, default: USER_ROLES.USER},
        currentPlan: {type: ObjectId, ref: 'TariffPlans', default: null},
        billings: {
            expirationDate: {type: Date, default: null},
            renewEnabled: {type: Boolean, default: false},
            subscribedDevices: {type: Number, required: true, default: 0},
            monthSubscribedDevices: {type: Number, required: true, default: 0},
            active: {type: Boolean, required: true, default: false} //is need this field
        },
        createdAt: {type: Date, default: Date.now},
        updatedAt: {type: Date, default: Date.now}
    }, {collection: 'Users'});


    mongoose.model('User', userSchema);

    if (!mongoose.Schemas) {
        mongoose.Schemas = {};
    }

    mongoose.Schemas['User'] = userSchema;

})();