'use strict';

var DEVICE_OS = require('../../constants/deviceOs');
var TestDataModule = function () {
    var self = this;

    this.users = [{
        _id: '55312b475bcd9d3016000001',
        minderId: 'minder_1',
        email: 'test@test.com',
        pass: '1',
        firstName: 'existsFirstName',
        lastName: 'existsLastName'
    }, {
        _id: '55312b475bcd9d3016000002',
        minderId: 'minder_2',
        email: 'test_unconfirmed@test.com',
        pass: '1',
        confirmToken: 'qwerty',
        firstName: 'unconfirmedFirstName',
        lastName: 'unconfirmedLastName'
    }, {
        _id: '55312b475bcd9d3016000003',
        minderId: 'minder_3',
        email: 'test_will_be_confirmed@test.com',
        pass: '1',
        confirmToken: 'willBeConfirmed',
        firstName: 'test',
        lastName: 'willBeConfirmed'
    }];

    this.devices = [];

    for (var i = 0, device = {}; i < 50; i++) {
        device = {
            deviceId: 'dev_' + i,
            deviceName: 'Test Device ' + i,
            deviceType: DEVICE_OS.WINDOWS_PHONE,
            user: self.users[0]._id,
            lastLocation: {
                lat: (Math.random() * 10),
                long: (Math.random() * 10),
                dateTime: new Date()
            }
        };
        if (Math.random() > 0.5) {
            device.isPayed = true;
        } else {
            device.isPayed = false;
        }
        if (Math.random() > 0.5) {
            device.enabledTrackLocation = true;
        } else {
            device.enabledTrackLocation = false;
        }
        this.devices.push(device);
    }

};

module.exports = new TestDataModule();