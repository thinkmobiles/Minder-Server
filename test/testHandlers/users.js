var request = require('supertest');
var expect = require("chai").expect;
var async = require('async');
var Config = require('./../config');
var testData = require('./../data/testData');

describe('Users', function() {
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

    describe('/signUp', function (){
        var url = '/signUp';

        it('User can\'t signUp without email', function (done) {
            var data = {
                pass: '1',
                firstName: 'testFirstName',
                lastName: 'testLastName'
            };

            userAgent1
                .post(url)
                .send(data)
                .end(function (err, res) {
                    if (err) {
                        done(err);
                    } else {

                        expect(res.status).to.equal(400);

                        done();
                    }
                });
        });

        it('User can\'t signUp without password', function (done) {
            var ticks = new Date().valueOf();
            var data = {
                email: 'test_' + ticks + '@mail.com',
                firstName: 'testFirstName',
                lastName: 'testLastName'
            };

            userAgent1
                .post(url)
                .send(data)
                .end(function (err, res) {
                    if (err) {
                        done(err);
                    } else {

                        expect(res.status).to.equal(400);

                        done();
                    }
                });
        });

        it('User can\'t signUp without firstName', function (done) {
            var ticks = new Date().valueOf();
            var data = {
                email: 'test_' + ticks + '@mail.com',
                pass: '1',
                lastName: 'testLastName'
            };

            userAgent1
                .post(url)
                .send(data)
                .end(function (err, res) {
                    if (err) {
                        done(err);
                    } else {

                        expect(res.status).to.equal(400);

                        done();
                    }
                });
        });

        it('User can\'t signUp from mobile without deviceId', function (done) {
            var ticks = new Date().valueOf();
            var data = {
                email: 'test_' + ticks + '@mail.com',
                pass: '1',
                firstName: 'testFirstName',
                lastName: 'testLastName'
            };

            userAgent1
                .post(url)
                .set('user-agent', conf.mobileUserAgent)
                .send(data)
                .end(function (err, res) {

                    if (err) {
                        done(err);
                    } else {
                        console.error(res.body);
                        expect(res.status).to.equal(400);

                        expect(res.body).to.have.property('error');
                        expect(res.body.error).contains('deviceId');
                        expect(res.body.error).include('deviceId');

                        done();
                    }
                });
        });

        it('User can\'t signUp from with exists email', function (done) {
            var data = testData.users[0];

            userAgent1
                .post(url)
                .send(data)
                .end(function (err, res) {

                    if (err) {
                        done(err);
                    } else {
                        expect(res.status).to.equal(400);
                        done();
                    }
                });
        });

        it('User can signUp from mobile by exists deviceId', function (done) {
            var ticks = new Date().valueOf();
            var data = {
                email: 'test_' + ticks + '@mail.com',
                pass: '1',
                firstName: 'testFirstName',
                lastName: 'testLastName',
                deviceId: 'dev_1',
                deviceName: 'Test Phone'
            };

            userAgent1
                .post(url)
                .set('user-agent', conf.mobileUserAgent)
                .send(data)
                .end(function (err, res) {

                    if (err) {
                        done(err);
                    } else {
                        expect(res.status).to.equal(400);
                        done();
                    }
                });
        });

        it('User can signUp from web by valid data', function (done) {
            var ticks = new Date().valueOf();
            var data = {
                email: 'test_' + ticks + '@mail.com',
                pass: '1',
                firstName: 'testFirstName',
                lastName: 'testLastName'
            };

            userAgent1
                .post(url)
                .send(data)
                .end(function (err, res) {

                    if (err) {
                        done(err);
                    } else {
                        expect(res.status).to.equal(201);
                        done();
                    }
                });
        });

        it('User can signUp from mobile by valid data', function (done) {
            var ticks = new Date().valueOf();
            var data = {
                email: 'test_' + ticks + '@mail.com',
                pass: '1',
                firstName: 'testFirstName',
                lastName: 'testLastName',
                deviceId: 'device_' + ticks,
                deviceName: 'Test Phone'
            };

            userAgent1
                .post(url)
                .set('user-agent', conf.mobileUserAgent)
                .send(data)
                .end(function (err, res) {

                    if (err) {
                        done(err);
                    } else {
                        console.log(res.body);
                        expect(res.status).to.equal(201);
                        done();
                    }
                });
        });

    });

    describe('/signIn', function () {
        var url = '/signIn';

        it('User can\'t sign in with unconfirmed email', function (done) {
            var data = testData.users[1];

            data.pass = '1';
            userAgent1
                .post(url)
                .send(data)
                .end(function (err, res) {
                    if (err) {
                        done (err);
                    } else {
                        expect(res.status).to.equal(400);
                        expect(res.body).to.have.property('error');
                        expect(res.body.error).contains('UnconfirmedEmail');
                        done();
                    }
                });
        });

        it('User can signIn by email / pass from web', function (done) {
            var data = testData.users[0];

            data.pass = '1';
            userAgent1
                .post(url)
                .send(data)
                .end(function (err, res) {
                    if (err) {
                        done (err);
                    } else {
                        expect(res.status).to.equal(200);
                        expect(res.body).to.have.property('success');

                        setTimeout(function () {
                            userAgent1
                                .get('/isAuth')
                                .end(function (err, res) {
                                    if (err) {
                                        done(err);
                                    } else {
                                        expect(res.status).to.equals(200);
                                        done();
                                    }
                                });
                        }, 100);
                    }
                });
        });

        it('User can signIn minderId from Mobile', function (done) {
            var data = testData.users[0];
            var signInData = {
                minderId: data.minderId,
                deviceId: 'device_1'
            };

            userAgent1
                .post(url)
                .set('user-agent', conf.mobileUserAgent)
                .send(signInData)
                .end(function (err, res) {
                    if (err) {
                        done (err);
                    } else {
                        expect(res.status).to.equal(200);
                        expect(res.body).to.have.property('success');

                        setTimeout(function () {
                            userAgent1
                                .get('/isAuth')
                                .end(function (err, res) {
                                    if (err) {
                                        done(err);
                                    } else {
                                        expect(res.status).to.equals(200);
                                        done();
                                    }
                                });
                        }, 100);
                    }
                });
        });

    });

    describe('/confirmEmail', function () {

        it('User can\'t confirm with invalid confirmToken', function (done) {
            var token = 'foo';
            var url = '/confirmEmail/' + token;

            userAgent1
                .get(url)
                .end(function(err, res) {
                    if (err) {
                        done(err);
                    } else {
                        expect(res.status).to.equals(200);
                        done();
                    }
                });
        });

        it('User can confirm with valid confirmToken', function (done) {
            var token = testData.users[2].confirmToken;
            var url = '/confirmEmail/' + token;

            userAgent1
                .get(url)
                .end(function(err, res) {
                    if (err) {
                        done(err);
                    } else {
                        expect(res.status).to.equals(200);
                        done();
                    }
                });
        });

    });
});