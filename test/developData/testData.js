'use strict';

var DEVICE_OS = require('../../constants/deviceOs');
var TestDataModule = function () {
    var self = this;

    this.users = [{
        _id: '55312b475bcd9d3016000001',
        minderId: 'minder_1',
        email: 'test@test.com',
        pass: '1234',
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

    for (var i = 0, device = {}; i < 500; i++) {
        device = {
            deviceId: 'dev_' + i,
            deviceName: 'Test Device ' + i,
            deviceType: DEVICE_OS.WINDOWS_PHONE,
            user: self.users[0]._id,
            name: 'Device name ' + i,
            lastLocation: {
                lat: (Math.random() * 10),
                long: (Math.random() * 10),
                dateTime: new Date()
            },
            billings: {
                subscriptionId: '',
                subscriptionDateTime: new Date(),
                expirationDate: new Date(new Date().setYear(new Date().getFullYear() + i))
            }
        };
        //if (Math.random() > 0.5) {
        //    device.isPayed = true;
        //} else {
        //    device.isPayed = false;
        //}
        //if (Math.random() > 0.5) {
        //    device.enabledTrackLocation = true;
        //} else {
        //    device.enabledTrackLocation = false;
        //}
        this.devices.push(device);
    }
    //this.tariffPlans = [
    //    {
    //        name: 'T1',
    //        description: '$1 Cost for 1 - 2 devices',
    //        cost: 1,
    //        minDevices: 1,
    //        maxDevices: 2,
    //        createdAt: new Date(),
    //        updatedAt: new Date()
    //    }, {
    //        name: 'T2',
    //        description: '$2.50 Cost for 3 - 4 devices',
    //        cost: 2.50,
    //        minDevices: 3,
    //        maxDevices: 4,
    //        createdAt: new Date(),
    //        updatedAt: new Date()
    //    }, {
    //        name: 'T3',
    //        description: '5 Cost for 5 - 10 devices',
    //        cost: 5.0,
    //        minDevices: 5,
    //        maxDevices: 10,
    //        createdAt: new Date(),
    //        updatedAt: new Date()
    //    }, {
    //        name: 'T4',
    //        description: '$10 Cost for 11 - 50 devices',
    //        cost: 10,
    //        minDevices: 11,
    //        maxDevices: 50,
    //        createdAt: new Date(),
    //        updatedAt: new Date()
    //    }, {
    //        name: 'T5',
    //        description: '$20 Cost for 51 - 500 devices',
    //        cost: 20,
    //        minDevices: 51,
    //        maxDevices: 500,
    //        createdAt: new Date(),
    //        updatedAt: new Date()
    //    }
    //];

};

module.exports = new TestDataModule();