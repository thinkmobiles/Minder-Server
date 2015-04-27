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
    var noSessionAgent = request.agent(baseUrl);
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

        }, 500);
    });

    describe('Test Session', function () {

        it('admin can signIn', function (done) {
            var signInData = testData.admins[0];
            signInData.pass = '1q2w3e4r';

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

        /*it('User2 can signIn', function (done) {
            var signInData = testData.users[3];
            signInData.pass = '1';

            userAgent2
                .post('/signIn')
                .send(signInData)
                .end(function (err, res) {
                    if (err) {
                        done(err);
                    } else {
                        expect(res.status).to.equals(200);
                        done();
                    }
                });
        });*/

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

            noSessionAgent
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
                        expect(res.body.error).to.contains('Not enough incoming parameters');

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
                        expect(res.body.error).to.contains('Not enough incoming parameters');

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
                        expect(res.status).to.equals(200);
                        expect(res.body).to.have.property('success');
                        done();
                    }
                });
        });

    });

    describe('GET /users/:id', function() {

        it ('Admin can get devices by id', function (done) {
            var devId = testData.devices[0]._id.toString();
            var url = '/devices/' + devId;

            adminAgent
                .get(url)
                .end(function (err, res) {
                    expect(res.status).to.equals(200);
                    expect(res.body).to.be.instanceOf(Object);
                    expect(res.body).to.have.property('_id');
                    expect(res.body._id).to.equals(devId);
                    done();
                });
        });

        it ('User can get the device by id', function (done) {
            var devId = testData.devices[0]._id.toString();
            var url = '/devices/' + devId;

            userAgent1
                .get(url)
                .end(function (err, res) {
                    expect(res.status).to.equals(200);
                    expect(res.body).to.be.instanceOf(Object);
                    expect(res.body).to.have.property('_id');
                    expect(res.body._id).to.equals(devId);
                    done();
                });
        });

        it ('User can\'t get other users device', function (done) {
            var devId = testData.devices[0]._id.toString();
            var url = '/devices/' + devId;

            userAgent2
                .get(url)
                .end(function (err, res) {
                    expect(res.status).to.equals(400);
                    expect(res.body).to.have.property('error');
                    done();
                });
        });

    });

    describe('PUT /users/:id', function() {

        it ('Admin can update the device', function (done) {
            var devId = testData.devices[0]._id.toString();
            var url = '/devices/' + devId;

            var data = {
                name: 'new name'
            };

            adminAgent
                .put(url)
                .send(data)
                .end(function (err, res) {
                    expect(res.status).to.equals(200);
                    expect(res.body).to.be.instanceOf(Object);
                    expect(res.body).to.have.property('success');
                    expect(res.body).to.have.property('model');
                    done();
                });
        });

    });

    describe('DELETE /device/:id', function() {
        it('Admin can delete the device by id', function(done) {
            var devId = testData.devices[1]._id.toString();
            var url = '/devices/' + devId;

            adminAgent
                .delete(url)
                .end(function (err, res) {
                    expect(res.status).to.equals(200);
                    expect(res.body).to.be.instanceOf(Object);
                    expect(res.body).to.have.property('success');
                    done();
                });
        });

        it('User can delete the device by id', function(done) {
            var devId = testData.devices[2]._id.toString();
            var url = '/devices/' + devId;

            userAgent1
                .delete(url)
                .end(function (err, res) {
                    expect(res.status).to.equals(200);
                    expect(res.body).to.be.instanceOf(Object);
                    expect(res.body).to.have.property('success');
                    done();
                });
        });

        it('User can delete the device by id', function(done) {
            var devId = testData.devices[3]._id.toString();
            var url = '/devices/' + devId;

            userAgent2
                .delete(url)
                .end(function (err, res) {
                    expect(res.status).to.equals(400);
                    expect(res.body).to.have.property('error');
                    done();
                });
        });

    });
});