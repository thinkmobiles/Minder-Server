'use strict';

var DEVICE_OS = require('../../constants/deviceOs');
var USER_ROLES = require('../../constants/userRoles');
var DEVICE_STATUSES = require('../../constants/deviceStatuses');
var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.Types.ObjectId;

var _id_T1 = "555ecce84d29ee5c16000001";
var _id_T2 = "555ecce84d29ee5c16000002";

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
        lastName: 'existsLastName',
        billings: {
            //currentPlan: ObjectId(_id_T2),
            currentPlan: _id_T2,
            subscribedDevices: 4
        }
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
        email: 'valid_user@test.com',
        pass: '1',
        confirmToken: '',
        firstName: 'valid',
        lastName: 'user'
    }];

    this.devices = [{
        deviceId: 'dev_1', // 0
        deviceName: 'Test Device 1',
        deviceType: DEVICE_OS.WINDOWS_PHONE,
        user: self.users[0]._id
    }, {
        deviceId: 'dev_2', // 1
        deviceName: 'Will be deleted by Admin',
        deviceType: DEVICE_OS.WINDOWS_PHONE,
        user: self.users[0]._id
    }, {
        deviceId: 'dev_3', // 2
        deviceName: 'Will be deleted by owner',
        deviceType: DEVICE_OS.WINDOWS_PHONE,
        user: self.users[0]._id,
        status: DEVICE_STATUSES.SUBSCRIBED
    }, {
        deviceId: 'dev_4',  // 3
        deviceName: 'Another device. But it will not removed via another user',
        deviceType: DEVICE_OS.WINDOWS_PHONE,
        user: self.users[0]._id
    }, {
        deviceId: 'dev_5', // 4
        deviceName: 'Subscribed device 1',
        deviceType: DEVICE_OS.WINDOWS_PHONE,
        user: self.users[0]._id,
        status: DEVICE_STATUSES.SUBSCRIBED,
        billings: {
            currentPlan: _id_T2,
            subscriptionDateTime: new Date(),
            expirationDate: new Date()
        }
    }, {
        deviceId: 'dev_6', // 5
        deviceName: 'Subscribed device 2',
        deviceType: DEVICE_OS.WINDOWS_PHONE,
        user: self.users[0]._id,
        status: DEVICE_STATUSES.SUBSCRIBED
    }, {
        deviceId: 'dev_7', // 6
        deviceName: 'Subscribed device 3',
        deviceType: DEVICE_OS.WINDOWS_PHONE,
        user: self.users[0]._id,
        status: DEVICE_STATUSES.SUBSCRIBED
    }, {
        deviceId: 'dev_8', // 7
        deviceName: 'Subscribed device 4',
        deviceType: DEVICE_OS.WINDOWS_PHONE,
        user: self.users[1]._id,
        status: DEVICE_STATUSES.SUBSCRIBED
    }];

};

module.exports = new TestDataModule();