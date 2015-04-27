'use strict';

module.exports = (function () {
    var mongoose = require('mongoose');
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var deviceSchema = mongoose.Schema({
        user: {type: ObjectId, ref: 'Users'},
        //minderId: {type: String, required: true, unique: true},
        deviceId: {type: String, required: true, unique: true},
        deviceType: {type: String, required: true},
        name: {type: String, default: ''},
        //enabledTrackLocation: {type: Boolean, required: true, default: false},
        //isPayed: {type: Boolean, required: true, default: false},
        //deviceStatus = subscribed | active | deleted
        status: {type: String, required: true, default: 'active'}, // active | deleted | subscribed
        lastLocation: {
            long: {type: Number, default: null},
            lat: {type: Number, default: null},
            //accuracy: {type: Number},  // meters
            dateTime: {type: Date, default: Date.now}
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