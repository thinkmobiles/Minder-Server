var DEVICE_STATUSES = require('../../constants/deviceStatuses');
var request = require('supertest');
var expect = require("chai").expect;
var async = require('async');
var Config = require('./../config');
var testData = require('./../data/testData');
var mongoose = require('mongoose');

describe('Devices', function () {
    var conf = new Config();
    var db = conf.db;
    var baseUrl = conf.baseUrl;
    var adminAgent = request.agent(baseUrl);
    var noSessionAgent = request.agent(baseUrl);
    var userAgent1 = request.agent(baseUrl);
    var userAgent2 = request.agent(baseUrl);
    var CreateTestData = require('./../data/index');
    var userSchema = mongoose.Schemas['User'];
    var UserModel = db.model('User', userSchema);
    var deviceSchema = mongoose.Schemas['Device'];
    var DeviceModel = db.model('Device', deviceSchema);
    var tariffPlanSchema = mongoose.Schemas['TariffPlan'];
    var TariffPlan = db.model('TariffPlan', tariffPlanSchema);

    before(function (done) {
        var createTestData;
        this.timeout(10000);

        createTestData = new CreateTestData(db);

        async.parallel([
            createTestData.createUsers,
            createTestData.createDevices
        ], function (err) {
            if (err) {
                done(err);
            } else {
                done();
            }
        });
    });

    describe('Test Session', function () {

        it('admin can signIn', function (done) {
            var signInData = testData.admins[0];

            signInData.pass = '1q2w3e4r';
            signInData.rememberMe = true;

            adminAgent
                .post('/signIn')
                .send(signInData)
                .end(function (err, res) {
                    if (err) {
                        done(err);
                    } else {
                        expect(res.status).to.equals(200);

                        setTimeout(function () {
                            adminAgent
                                .get('/isAuth')
                                .expect(200) //Status code
                                .end(function (err, res) {
                                    if (err) {
                                        done(err);
                                    } else {
                                        done(null);
                                    }
                                });
                        }, 200);
                    }
                });
        });

        it('User1 can signIn from mobile', function (done) {
            var signInData = testData.users[0];
            var deviceId = testData.devices[0].deviceId;

            signInData.pass = '1';
            signInData.rememberMe = true;
            signInData.deviceId = deviceId;

            userAgent1
                .post('/signIn')
                .send(signInData)
                .end(function (err, res) {
                    if (err) {
                        done(err);
                    } else {
                        expect(res.status).to.equals(200);

                        setTimeout(function () {
                            userAgent1
                                .get('/isAuth')
                                .expect(200) //Status code
                                .end(function (err, res) {
                                    if (err) {
                                        done(err);
                                    } else {
                                        done(null);
                                    }
                                });
                        }, 200);
                    }
                });
        });

        it('User2 can signIn', function (done) {
            var signInData = testData.users[3];

            signInData.pass = '1';
            signInData.rememberMe = true;

            userAgent2
                .post('/signIn')
                .send(signInData)
                .end(function (err, res) {
                    if (err) {
                        done(err);
                    } else {
                        expect(res.status).to.equals(200);

                        setTimeout(function () {
                            userAgent2
                                .get('/isAuth')
                                .expect(200) //Status code
                                .end(function (err, res) {
                                    if (err) {
                                        done(err);
                                    } else {
                                        done(null);
                                    }
                                });
                        }, 200);
                    }
                });
        });

    });

    describe('POST /sync', function () {

        //it('User can\'t sync without deviceId', function (done) {
        //    var url = '/sync';
        //    var data = {
        //        src: conf.base64,
        //        originalName: 'guitar_logo.jpg',
        //        path: 'c:/images',
        //        size: 2.3
        //    };

        //    userAgent1
        //        .post(url)
        //        .send(data)
        //        .end(function (err, res) {
        //            if (err) {
        //                return done(err);
        //            }

        //            expect(res.status).to.equals(400);
        //            expect(res.body).to.be.instanceOf(Object);
        //            expect(res.body).to.have.property('error');
        //            expect(res.body.error).to.include('Not enough incoming parameters');
        //            done();
        //        });

        //});

        it('Can\'t sync with other user\'s deviceId', function (done) {
            var url = '/sync';
            var deviceId = testData.devices[7]._id.toString();
            var data = {
                //deviceId: deviceId,
                src: conf.base64,
                originalName: 'guitar_logo.jpg',
                path: 'c:/images',
                size: 2.3
            };

            userAgent1
                .post(url)
                .send(data)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    expect(res.status).to.equals(400);
                    expect(res.body).to.be.instanceOf(Object);
                    expect(res.body).to.have.property('error');
                    expect(res.body.error).to.include('You do not have sufficient rights');
                    done();
                });
        });

        it('User can upload files', function (done) {
            var url = '/sync';
            var deviceId = testData.devices[0]._id.toString();
            var data = {
                deviceId: deviceId,
                src: conf.base64,
                originalName: 'guitar_logo.jpg',
                path: 'c:/images',
                size: 2.3
            };

            userAgent1
                .post(url)
                .send(data)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    expect(res.status).to.equals(201);
                    expect(res.body).to.be.instanceOf(Object);
                    expect(res.body).to.have.property('success');
                    done();
                });
        });

    });

    //describe('GET /sync/files/:fileName', function () {

    //    it('User can get the uploaded image', function (done) {

    //        async.waterfall([

    //            //save the image:
    //            function (cb) {
    //                var url = '/sync';
    //                var deviceId = testData.devices[0]._id.toString();
    //                var data = {
    //                    deviceId: deviceId,
    //                    src: conf.base64,
    //                    originalName: 'guitar_logo.jpg',
    //                    path: 'c:/images',
    //                    size: 2.3
    //                };

    //                userAgent1
    //                    .post(url)
    //                    .send(data)
    //                    .end(function (err, res) {
    //                        if (err) {
    //                            return cb(err)
    //                        }

    //                        expect(res.status).to.equals(201);
    //                        expect(res.body).to.be.instanceOf(Object);
    //                        expect(res.body).to.have.property('success');
    //                        expect(res.body).to.have.property('url');

    //                        cb(null, res.body.url);
    //                    });
    //            },

    //            //try to get the image:
    //            function (url, cb) {
    //                var fileUrl = url;

    //                userAgent1
    //                    .get(fileUrl)
    //                    .end(function (err, res) {
    //                        if (err) {
    //                            return cb(err)
    //                        }

    //                        expect(res.status).to.equals(200);
    //                        cb(null, res.body.url);
    //                    });
    //            }

    //        ], function (err) {
    //            if (err) {
    //                return done(err);
    //            }
    //            done();
    //        });
    //    });

    //});

    //describe('GET /sync/devices/:id/files', function () {

    //    it('User can get the files by device\'s _id', function (done) {
    //        var deviceId = testData.devices[0]._id.toString();
    //        var url = '/sync/devices/' + deviceId + '/files';

    //        userAgent1
    //            .get(url)
    //            .end(function (err, res) {
    //                var fileModel;

    //                if (err) {
    //                    return done(err)
    //                }

    //                expect(res.status).to.equals(200);
    //                expect(res.body).to.be.instanceOf(Array);
    //                expect(res.body.length).to.equals(2);

    //                fileModel = res.body[0];

    //                expect(fileModel).to.be.instanceOf(Object);
    //                expect(fileModel).to.have.property('url');
    //                expect(fileModel.url).to.include('/sync/files/');
    //                done();
    //            });
    //    });

    //});

});