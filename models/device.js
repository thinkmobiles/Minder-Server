'use strict';
var DEVICE_STATUSES = require('../constants/deviceStatuses');

module.exports = (function () {
    var mongoose = require('mongoose');
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var deviceSchema = mongoose.Schema({
        user: {type: ObjectId, ref: 'Users'},
        deviceId: {type: String, required: true, unique: true},
        deviceType: {type: String, required: true},
        name: {type: String, default: 'Device name'},
        status: {type: String, required: true, default: DEVICE_STATUSES.ACTIVE}, // active | deleted | subscribed
        lastLocation: {
            long: {type: Number, default: null},
            lat: {type: Number, default: null},
            //accuracy: {type: Number},  // meters
            dateTime: {type: Date, default: Date.now}
        },
        billings: {
            subscriptionId: {type: String, default: null},
            subscriptionDateTime: {type: Date, default: null},
            expirationDate: {type: Date, default: null}
            //renweall //TODO: ???
        },
        createdAt: {type: Date, default: Date.now},
        updatedAt: {type: Date, default: Date.now}
    }, {collection: 'Devices'});

    mongoose.model('Device', deviceSchema);

    if (!mongoose.Schemas) {
        mongoose.Schemas = {};
    }

    mongoose.Schemas['Device'] = deviceSchema;
})();