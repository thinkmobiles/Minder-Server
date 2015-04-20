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
    }];

    this.devices = [{
        deviceId: 'dev_1',
        deviceName: 'Test Device 1',
        deviceType: DEVICE_OS.WINDOWS_PHONE,
        user: self.users[0]._id
    }];

};

module.exports = new TestDataModule();