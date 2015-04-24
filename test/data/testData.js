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
    }, {
        _id: '55312b475bcd9d3016000004',
        minderId: 'minder_4',
        email: 'validUser@test.com',
        pass: '1',
        confirmToken: '',
        firstName: 'valid',
        lastName: 'user'
    }];

    this.devices = [{
        deviceId: 'dev_1',
        deviceName: 'Test Device 1',
        deviceType: DEVICE_OS.WINDOWS_PHONE,
        user: self.users[0]._id
    }, {
        deviceId: 'dev_2',
        deviceName: 'Will be deleted by Admin',
        deviceType: DEVICE_OS.WINDOWS_PHONE,
        user: self.users[0]._id
    }, {
        deviceId: 'dev_3',
        deviceName: 'Will be deleted by owner',
        deviceType: DEVICE_OS.WINDOWS_PHONE,
        user: self.users[0]._id
    }, {
        deviceId: 'dev_4',
        deviceName: 'Another device. But it will not removed via another user',
        deviceType: DEVICE_OS.WINDOWS_PHONE,
        user: self.users[0]._id
    }];

};

module.exports = new TestDataModule();