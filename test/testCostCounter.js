var DEVICE_STATUSES = require('../constants/deviceStatuses');
var request = require('supertest');
var expect = require("chai").expect;
var async = require('async');
var Config = require('./config');
var mongoose = require('mongoose');
var calculateTariff = require('../public/js/libs/costCounter_2');

//TODO: return devicesToPay ...

describe('CostCounter', function () {
    var conf = new Config();
    var db = conf.db;
    var userSchema = mongoose.Schemas['User'];
    var UserModel = db.model('User', userSchema);
    var deviceSchema = mongoose.Schemas['Device'];
    var DeviceModel = db.model('Device', deviceSchema);
    var tariffPlanSchema = mongoose.Schemas['TariffPlan'];
    var TariffPlanModel = db.model('TariffPlan', tariffPlanSchema);
    var planModels;

    before(function (done) {
        async.waterfall([

            //get planModels:
            function (cb) {
                TariffPlanModel
                    .find({})
                    .sort('name')
                    .exec(function (err, plans) {
                        var T1;

                        if (err) {
                            return cb(err);
                        }

                        planModels = plans;

                        expect(planModels.length).to.equals(9);

                        T1 = planModels[0];
                        expect(T1).to.have.property('name');
                        expect(T1.name).to.equals('T1');

                        cb();
                    });
            }

        ], function (err, result) {
            if (err) {
                return done(err);
            }
            done();
        });
    });

    describe('Test Subscribe Free devices', function () {

        it('The first device can subscribed as FREE', function (done) {
            var ticks = new Date().valueOf();
            var userData = {
                email: 'test_' + ticks + '@mail.com',
                firstName: 'foo',
                lastName: 'foo',
                pass: '111111',
                billings: {
                    subscribedDevices: 0,
                    currentPlan: planModels[0]._id
                }
            };
            var userModel = new UserModel(userData);
            var currentPlanString = userModel.billings.currentPlan.toString();
            var deviceData = {
                deviceId: 'dev_test_' + ticks,
                status: DEVICE_STATUSES.ACTIVE
            };
            var deviceModel = new DeviceModel(deviceData);
            var counterParams = {
                user: userModel,
                plans: planModels,
                devices: [deviceModel]
            };

            expect(currentPlanString).to.equals(planModels[0]._id.toString());
            expect(userModel.billings.subscribedDevices).to.equals(0);
            expect(deviceModel.status).to.equals(DEVICE_STATUSES.ACTIVE);

            calculateTariff(counterParams, function (err, result) {
                if (err) {
                    return done(err);
                }

                expect(result).to.be.instanceOf(Object);
                expect(result).to.have.property('amount');
                expect(result).to.have.property('planModel');
                expect(result).to.have.property('expirationDate');
                expect(result).to.have.property('subscribedDevices');
                expect(result).to.have.property('devicesToPay');

                expect(result.amount).to.equals(0);
                expect(result.subscribedDevices).to.equals(1);
                expect(result.planModel).to.be.instanceOf(Object);
                expect(result.planModel).to.have.property('name');
                expect(result.planModel.name).to.equals('T1');
                expect(result.devicesToPay).to.equals(1);

                done();
            });
        });

    });

    describe('Upgrade T1 - T2', function () {

        it('User can subscribe the three first devices and change plan to "T2"', function (done) {
            var ticks = new Date().valueOf();
            var userData = {
                email: 'test_' + ticks + '@mail.com',
                firstName: 'foo',
                lastName: 'foo',
                pass: '111111',
                billings: {
                    subscribedDevices: 1,
                    currentPlan: planModels[0]._id //T1
                }
            };
            var userModel = new UserModel(userData);
            var currentPlanString = userModel.billings.currentPlan.toString();
            var deviceData = {
                deviceId: 'dev_test_' + ticks,
                status: DEVICE_STATUSES.ACTIVE
            };
            var deviceModel = new DeviceModel(deviceData);
            var counterParams = {
                user: userModel,
                plans: planModels,
                devices: [deviceModel, deviceModel]
            };
            var amountT2 = planModels[1].amount;

            expect(currentPlanString).to.equals(planModels[0]._id.toString());
            expect(userModel.billings.subscribedDevices).to.equals(1);
            expect(deviceModel.status).to.equals(DEVICE_STATUSES.ACTIVE);

            calculateTariff(counterParams, function (err, result) {
                if (err) {
                    return done(err);
                }

                expect(result).to.be.instanceOf(Object);
                expect(result).to.have.property('amount');
                expect(result).to.have.property('planModel');
                expect(result).to.have.property('expirationDate');
                expect(result).to.have.property('subscribedDevices');
                expect(result).to.have.property('devicesToPay');

                expect(result.amount).to.equals(amountT2 * 2);
                expect(result.subscribedDevices).to.equals(3);
                expect(result.planModel).to.be.instanceOf(Object);
                expect(result.planModel).to.have.property('name');
                expect(result.planModel.name).to.equals('T2');
                expect(result.devicesToPay).to.equals(2);

                done();
            });
        });

        it('User can subscribe and re-subscribe devices', function (done) {
            var ticks = new Date().valueOf();
            var userData = {
                email: 'test_' + ticks + '@mail.com',
                firstName: 'foo',
                lastName: 'foo',
                pass: '111111',
                billings: {
                    subscribedDevices: 4,
                    currentPlan: planModels[1]._id //T2
                }
            };
            var userModel = new UserModel(userData);
            var currentPlanString = userModel.billings.currentPlan.toString();
            var activeDeviceModel = new DeviceModel({
                deviceId: 'dev_test_' + ticks,
                status: DEVICE_STATUSES.ACTIVE
            });
            var subscribedDeviceModel = new DeviceModel({
                deviceId: 'dev_test_' + ticks,
                status: DEVICE_STATUSES.SUBSCRIBED
            });

            var counterParams = {
                user: userModel,
                plans: planModels,
                devices: [subscribedDeviceModel, subscribedDeviceModel, activeDeviceModel, activeDeviceModel]
            };
            var amountT3 = planModels[2].amount; //(4 + 2) devices

            expect(currentPlanString).to.equals(planModels[1]._id.toString());
            expect(userModel.billings.subscribedDevices).to.equals(4);

            calculateTariff(counterParams, function (err, result) {
                if (err) {
                    return done(err);
                }

                expect(result).to.be.instanceOf(Object);
                expect(result).to.have.property('amount');
                expect(result).to.have.property('planModel');
                expect(result).to.have.property('expirationDate');
                expect(result).to.have.property('subscribedDevices');
                expect(result).to.have.property('devicesToPay');

                expect(result.amount).to.equals(amountT3 * counterParams.devices.length);
                expect(result.subscribedDevices).to.equals(6);
                expect(result.planModel).to.be.instanceOf(Object);
                expect(result.planModel).to.have.property('name');
                expect(result.planModel.name).to.equals('T3');
                expect(result.devicesToPay).to.equals(4);

                done();
            });
        });

        it('User can subscribe the second device and change plan to "T2"', function (done) {
            var ticks = new Date().valueOf();
            var userData = {
                email: 'test_' + ticks + '@mail.com',
                firstName: 'foo',
                lastName: 'foo',
                pass: '111111',
                billings: {
                    subscribedDevices: 1,
                    currentPlan: planModels[0]._id //T1
                }
            };
            var userModel = new UserModel(userData);
            var currentPlanString = userModel.billings.currentPlan.toString();
            var deviceData = {
                deviceId: 'dev_test_' + ticks,
                status: DEVICE_STATUSES.ACTIVE
            };
            var deviceModel = new DeviceModel(deviceData);
            var counterParams = {
                user: userModel,
                plans: planModels,
                devices: [deviceModel]
            };
            var amountT2 = planModels[1].amount;

            expect(currentPlanString).to.equals(planModels[0]._id.toString());
            expect(userModel.billings.subscribedDevices).to.equals(1);
            expect(deviceModel.status).to.equals(DEVICE_STATUSES.ACTIVE);

            calculateTariff(counterParams, function (err, result) {
                if (err) {
                    return done(err);
                }

                expect(result).to.be.instanceOf(Object);
                expect(result).to.have.property('amount');
                expect(result).to.have.property('planModel');
                expect(result).to.have.property('expirationDate');
                expect(result).to.have.property('subscribedDevices');
                expect(result).to.have.property('devicesToPay');

                expect(result.amount).to.equals(amountT2);
                expect(result.subscribedDevices).to.equals(2);
                expect(result.planModel).to.be.instanceOf(Object);
                expect(result.planModel).to.have.property('name');
                expect(result.planModel.name).to.equals('T2');
                expect(result.devicesToPay).to.equals(1);

                done();
            });
        });

    });

    describe('Upgrade to Year (T7 - base plan)', function () {

        it('User can subscribe the first device to T7', function (done) {
            var ticks = new Date().valueOf();
            var userData = {
                email: 'test_' + ticks + '@mail.com',
                firstName: 'foo',
                lastName: 'foo',
                pass: '111111',
                billings: {
                    subscribedDevices: 0,
                    currentPlan: planModels[0]._id
                }
            };
            var userModel = new UserModel(userData);
            var currentPlanString = userModel.billings.currentPlan.toString();
            var deviceData = {
                deviceId: 'dev_test_' + ticks,
                status: DEVICE_STATUSES.ACTIVE
            };
            var deviceModel = new DeviceModel(deviceData);
            var counterParams = {
                user: userModel,
                plans: planModels,
                devices: [deviceModel],
                period: 'year'
            };

            expect(currentPlanString).to.equals(planModels[0]._id.toString());
            expect(userModel.billings.subscribedDevices).to.equals(0);
            expect(deviceModel.status).to.equals(DEVICE_STATUSES.ACTIVE);

            calculateTariff(counterParams, function (err, result) {
                var amountT7 = planModels[6].amount;

                if (err) {
                    return done(err);
                }

                expect(result).to.be.instanceOf(Object);
                expect(result).to.have.property('amount');
                expect(result).to.have.property('planModel');
                expect(result).to.have.property('expirationDate');
                expect(result).to.have.property('subscribedDevices');
                expect(result).to.have.property('devicesToPay');

                expect(result.amount).to.equals(amountT7);
                expect(result.subscribedDevices).to.equals(1);
                expect(result.planModel).to.be.instanceOf(Object);
                expect(result.planModel).to.have.property('name');
                expect(result.planModel.name).to.equals('T7');
                expect(result.devicesToPay).to.equals(1);

                done();
            });
        });

        it('User can re-subscribe the first device to T7', function (done) {
            var ticks = new Date().valueOf();
            var userData = {
                email: 'test_' + ticks + '@mail.com',
                firstName: 'foo',
                lastName: 'foo',
                pass: '111111',
                billings: {
                    subscribedDevices: 1,
                    currentPlan: planModels[6]._id
                }
            };
            var userModel = new UserModel(userData);
            var currentPlanString = userModel.billings.currentPlan.toString();
            var deviceData = {
                deviceId: 'dev_test_' + ticks,
                status: DEVICE_STATUSES.SUBSCRIBED
            };
            var deviceModel = new DeviceModel(deviceData);
            var counterParams = {
                user: userModel,
                plans: planModels,
                devices: [deviceModel],
                period: 'year'
            };

            expect(currentPlanString).to.equals(planModels[6]._id.toString());
            expect(userModel.billings.subscribedDevices).to.equals(1);
            expect(deviceModel.status).to.equals(DEVICE_STATUSES.SUBSCRIBED);

            calculateTariff(counterParams, function (err, result) {
                var amountT7 = planModels[6].amount;

                if (err) {
                    return done(err);
                }

                expect(result).to.be.instanceOf(Object);
                expect(result).to.have.property('amount');
                expect(result).to.have.property('planModel');
                expect(result).to.have.property('expirationDate');
                expect(result).to.have.property('subscribedDevices');
                expect(result).to.have.property('devicesToPay');

                expect(result.amount).to.equals(amountT7);
                expect(result.subscribedDevices).to.equals(1);
                expect(result.planModel).to.be.instanceOf(Object);
                expect(result.planModel).to.have.property('name');
                expect(result.planModel.name).to.equals('T7');
                expect(result.devicesToPay).to.equals(1);

                done();
            });
        });
    });
});