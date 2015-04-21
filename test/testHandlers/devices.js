var request = require('supertest');
var expect = require("chai").expect;
var async = require('async');
var Config = require('./../config');
var testData = require('./../data/testData');

describe('Devices', function() {
    var conf = new Config();
    var db = conf.db;
    var baseUrl = conf.baseUrl;
    var adminAgent = request.agent(baseUrl);
    var userAgent1 = request.agent(baseUrl);
    var userAgent2 = request.agent(baseUrl);
    var CreateTestData = require('./../data/index');

    before(function (done) {
        var createTestData;
        this.timeout(5000);

        setTimeout(function () {
            console.log('waiting for the server');

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

        }, 2000);
    });

    describe('Test Session', function () {

        it('User1 can signIn', function (done) {
            var signInData = testData.users[0];
            signInData.pass = '1';

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

    });

    describe('PUT /location', function () {
        var url = '/devices/locate';

        it('User can\'t update location if not logined', function (done) {
            var data = {
                minderId: 'minder_1',
                deviceId: 'dev_1',
                location: {
                    long: 60.321,
                    lat: 29.987
                }
            };

            userAgent2
                .put(url)
                .send(data)
                .end(function (err, res) {
                    if (err) {
                        done(err);
                    } else {
                        expect(res.status).to.equals(401);
                        done();
                    }
                });
        });

        it('User can\'t update location without param "deviceId"', function (done) {
            var data = {
                minderId: 'minder_1',
                location: {
                    long: 60.321,
                    lat: 29.987
                }
            };

            userAgent1
                .put(url)
                .send(data)
                .end(function (err, res) {
                    if (err) {
                        done(err);
                    } else {
                        expect(res.status).to.equals(400);
                        expect(res.body).to.have.property('error');
                        expect(res.body.error).to.contains('NotEnoughIncomingParameters');

                        done();
                    }
                });
        });

        it('User can\'t update location without param "location"', function (done) {
            var data = {
                minderId: 'minder_1',
                deviceId: 'dev_1'
            };

            userAgent1
                .put(url)
                .send(data)
                .end(function (err, res) {
                    if (err) {
                        done(err);
                    } else {
                        expect(res.status).to.equals(400);
                        expect(res.body).to.have.property('error');
                        expect(res.body.error).to.contains('NotEnoughIncomingParameters');

                        done();
                    }
                });
        });

        it('User can update location with valid data', function (done) {
            var data = {
                minderId: 'minder_1',
                deviceId: 'dev_1',
                location: {
                    long: 60.321,
                    lat: 29.987
                }
            };

            userAgent1
                .put(url)
                .send(data)
                .end(function (err, res) {
                    if (err) {
                        done(err);
                    } else {
                        console.log(res.body);
                        expect(res.status).to.equals(200);
                        expect(res.body).to.have.property('success');
                        done();
                    }
                });
        });

    });

});