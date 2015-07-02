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
        status: {type: Number, required: true, default: DEVICE_STATUSES.ACTIVE}, // 1 - active | 0 - deleted | 2 - subscribed
        lastLocation: {
            //long: {type: Number, default: null},
            //lat: {type: Number, default: null},
            dateTime: { type: Date, default: Date.now },
            coordinates: {type: Array, default: [0, 0]}
        },
        billings: {
            subscriptionId: {type: String, default: null},
            subscriptionDateTime: {type: Date, default: null},
            expirationDate: {type: Date, default: null},
            renewEnabled: {type: Boolean, default: false}
        },
        geoFence: {
            enabled: {type: Boolean, default: false},
            fixedLocation: {
                long: {type: Number, default: null},
                lat: {type: Number, default: null}
            },
            radius: { type: Number, default: 3000 }, //in meters
            subscriptionId: { type: String, default: null },
            subscriptionDateTime: { type: Date, default: null },
            expirationDate: { type: Date, default: null },
            status: { type: Number, required: true, default: DEVICE_STATUSES.ACTIVE }, // 1 - active | 0 - deleted | 2 - subscribed
            withinFence: {type: Boolean, default: true}
        },
        createdAt: {type: Date, default: Date.now},
        updatedAt: {type: Date, default: Date.now}
    }, {collection: 'Devices'});

    mongoose.model('Device', deviceSchema);

    if (!mongoose.Schemas) {
        mongoose.Schemas = {};
    }

    mongoose.Schemas['Device'] = deviceSchema;

    if (process.env.NODE_ENV !== 'production') {
        deviceSchema.set('autoIndex', false);
    }

})();