'use strict';

var DEVICE_OS = require('../../constants/deviceOs');
var USER_ROLES = require('../../constants/userRoles');

var TestDataModule = function () {
    var self = this;

    this.admins = [{
        minderId: 'minder_admin',
        email: 'admin@admin.com',
        pass: '1q2w3e4r',
        firstName: 'admin',
        lastName: 'admin',
        role: USER_ROLES.ADMIN
    }];

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

    this.devices = [{
        deviceId: 'dev_1',
        deviceName: 'Test Device 1',
        deviceType: DEVICE_OS.WINDOWS_PHONE,
        user: self.users[0]._id
    }];

};

module.exports = new TestDataModule();