var DEVICE_STATUSES = require('../../constants/deviceStatuses');
var RESPONSES = require('../../constants/responses');

var request = require('supertest');
var expect = require("chai").expect;
var async = require('async');
var Config = require('./../config');
var testData = require('./../data/testData');
var mongoose = require('mongoose');

describe('devices', function () {
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
                                .expect(200)//Status code
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
            signInData.rememberMe = true;
            
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
                                .expect(200)//Status code
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
                                .expect(200)//Status code
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
    
    describe('GET /devices/:id', function () {
        
        it('Admin can get devices by id', function (done) {
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
        
        it('User can get the device by id', function (done) {
            var devId = testData.devices[0]._id.toString();
            var url = '/devices/' + devId;
            var deviceModel;

            userAgent1
                .get(url)
                .end(function (err, res) {
                expect(res.status).to.equals(200);
                expect(res.body).to.be.instanceOf(Object);
                
                deviceModel = res.body;

                expect(deviceModel).to.have.property('_id');
                expect(deviceModel).to.have.property('geoFence');
                expect(deviceModel._id).to.equals(devId);
                expect(deviceModel.geoFence).to.be.instanceOf(Object);
                done();
            });
        });
        
        it('User can\'t get other users device', function (done) {
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
    
    describe('PUT /devices/:id', function () {
        
        it('Admin can update the device', function (done) {
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
    
    describe('PUT /devices/geoFence/:id', function () {
        
        it('Owner can update the geo fence options', function (done) {
            var devId = testData.devices[0]._id.toString();
            var url = '/devices/' + devId;
            var enabled = true;
            var long = 22.299042;
            var lat = 48.618308;
            var radius = 5;
            
            var data = {
                geoFence: {
                    enabled: enabled,
                    fixedLocation: {
                        long: long,
                        lat: lat
                    },
                    radius: radius
                }
            };
            
            adminAgent
                .put(url)
                .send(data)
                .end(function (err, res) {
                var deviceModel;
                
                expect(res.status).to.equals(200);
                expect(res.body).to.be.instanceOf(Object);
                expect(res.body).to.have.property('success');
                expect(res.body).to.have.property('model');
                expect(res.body.model).to.have.property('geoFence');
                
                deviceModel = res.body.model;
                
                expect(deviceModel.geoFence.enabled).to.equals(enabled);
                expect(deviceModel.geoFence.fixedLocation.long).to.equals(long);
                expect(deviceModel.geoFence.fixedLocation.lat).to.equals(lat);
                expect(deviceModel.geoFence.radius).to.equals(radius);
                
                done();
            });
        });

    });
    
    describe('PATCH /device/:id', function () {
        
        //ACTIVATE:
        it('Admin can activate the device by id', function (done) {
            var devId = testData.devices[4]._id.toString();
            var url = '/devices/' + devId;
            var data = {
                status: DEVICE_STATUSES.ACTIVE
            };
            
            adminAgent
                .patch(url)
                .send(data)
                .end(function (err, res) {
                expect(res.status).to.equals(200);
                expect(res.body).to.be.instanceOf(Object);
                expect(res.body).to.have.property('_id');
                expect(res.body).to.have.property('status');
                expect(res.body.status).to.equals(DEVICE_STATUSES.ACTIVE);
                done();
            });
        });
        
        it('User can activate the device by id', function (done) {
            var devId = testData.devices[2]._id.toString();
            var url = '/devices/' + devId;
            var data = {
                status: DEVICE_STATUSES.ACTIVE
            };
            
            userAgent1
                .patch(url)
                .send(data)
                .end(function (err, res) {
                expect(res.status).to.equals(200);
                expect(res.body).to.be.instanceOf(Object);
                expect(res.body).to.have.property('_id');
                expect(res.body).to.have.property('status');
                expect(res.body.status).to.equals(DEVICE_STATUSES.ACTIVE);
                done();
            });
        });
        
        it('Another user can\'t delete the device by id', function (done) {
            var devId = testData.devices[3]._id.toString();
            var url = '/devices/' + devId;
            var data = {
                status: DEVICE_STATUSES.DELETED
            };
            
            userAgent2
                .patch(url)
                .send(data)
                .end(function (err, res) {
                expect(res.status).to.equals(400);
                expect(res.body).to.have.property('error');
                expect(res.body.error).to.include('Not Found');
                done();
            });
        });
        
        //DELETE:
        it('Admin can delete the device by id', function (done) {
            var devId = testData.devices[4]._id.toString();
            var url = '/devices/' + devId;
            var data = {
                status: DEVICE_STATUSES.DELETED
            };
            
            adminAgent
                .patch(url)
                .send(data)
                .end(function (err, res) {
                expect(res.status).to.equals(200);
                expect(res.body).to.be.instanceOf(Object);
                expect(res.body).to.have.property('_id');
                expect(res.body).to.have.property('status');
                expect(res.body.status).to.equals(DEVICE_STATUSES.DELETED);
                done();
            });
        });
        
        it('User can delete the device by id', function (done) {
            var devId = testData.devices[2]._id.toString();
            var url = '/devices/' + devId;
            var data = {
                status: DEVICE_STATUSES.DELETED
            };
            
            userAgent1
                .patch(url)
                .send(data)
                .end(function (err, res) {
                expect(res.status).to.equals(200);
                expect(res.body).to.be.instanceOf(Object);
                expect(res.body).to.have.property('_id');
                expect(res.body).to.have.property('status');
                expect(res.body.status).to.equals(DEVICE_STATUSES.DELETED);
                done();
            });
        });

    });
    
    describe('POST /devices/unsubscribe', function () {
        var url = '/devices/unsubscribe';
        
        it('User can unsubscribe devices', function (done) {
            var deviceIds = [
                testData.devices[4]._id.toString(),
                testData.devices[5]._id.toString(),
                testData.devices[6]._id.toString()
            ];
            var data = {
                deviceIds: deviceIds
            };
            
            userAgent1
                .post(url)
                .send(data)
                .end(function (err, res) {
                var userId = testData.users[0]._id;
                
                if (err) {
                    done(err);
                } else {
                    expect(res.status).to.equals(200);
                    
                    async.parallel([

                            //check the user:
                        function (cb) {
                            UserModel.findOne({ _id: userId }, function (err, userModel) {
                                if (err) {
                                    return cb(err);
                                }
                                expect(userModel.billings.subscribedDevices).to.equals(0);
                                cb();
                            });
                        },

                            //check devices:
                        function (cb) {
                            
                            DeviceModel.find({
                                _id: { $in: deviceIds },
                                status: DEVICE_STATUSES.SUBSCRIBED
                            }, function (err, devices) {
                                if (err) {
                                    return cb(err);
                                }
                                expect(devices.length).to.equals(0);
                                cb();
                            });
                        }
                    ], function (err) {
                        if (err) {
                            return done(err);
                        }
                        done();
                    });

                }
            });
        });
    });
    
    describe('POST /devices/:id/geoFence/unsubscribe', function () {
        
        it('User can unsubscribe the geoFence packet', function (done) {
            var deviceId = testData.devices[0]._id.toString();
            var url = '/devices/' + deviceId + '/geoFence/unsubscribe';
            
            async.waterfall([
                
                //check the model before unsubscribe:
                function (cb) {
                    DeviceModel.findById(deviceId, function (err, deviceModel) {
                        if (err) {
                            return cb(err);
                        }
                        
                        expect(deviceModel).to.be.instanceof(Object);
                        expect(deviceModel).to.have.property('geoFence');
                        expect(deviceModel.geoFence).to.be.instanceof(Object);
                        expect(deviceModel.geoFence).to.have.property('status');
                        expect(deviceModel.geoFence.status).to.equals(DEVICE_STATUSES.SUBSCRIBED);
                        
                        cb();
                    });
                },

                //make request and check response:
                function (cb) {
                    userAgent1
                        .post(url)
                        .end(function (err, res) {
                        var deviceModel;
                        
                        if (err) {
                            return cb(err);
                        }
                        
                        expect(res.status).to.equals(200);
                        expect(res.body).to.be.instanceOf(Object);
                        expect(res.body).to.be.have.property('success');
                        expect(res.body).to.be.have.property('device');
                        
                        deviceModel = res.body.device;
                        
                        expect(deviceModel).to.be.instanceOf(Object);
                        expect(deviceModel).to.have.property('_id');
                        expect(deviceModel).to.have.property('name');
                        expect(deviceModel).to.have.property('user');
                        expect(deviceModel).to.have.property('billings');
                        expect(deviceModel).to.have.property('geoFence');
                        
                        cb(null, deviceModel);
                    });
                },

                //check db:
                function (model, cb) {
                    DeviceModel.findById(deviceId, function (err, deviceModel) {
                        if (err) {
                            return cb(err);
                        }
                        
                        expect(deviceModel).to.be.instanceof(Object);
                        expect(deviceModel).to.have.property('geoFence');
                        expect(deviceModel.geoFence).to.be.instanceof(Object);
                        expect(deviceModel.geoFence).to.have.property('status');
                        expect(deviceModel.geoFence.status).to.equals(DEVICE_STATUSES.ACTIVE);
                        
                        cb();
                    });
                }
            ], function (err) {
                if (err) {
                    return done(err);
                }
                done();
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
            var deviceId = 'dev_9';
            var long = 60.321;
            var lat = 30.000;
            var data = {
                minderId: 'minder_1',
                deviceId: deviceId,
                location: {
                    long: long,
                    lat: lat
                }
            };
            
            async.waterfall([
                
                //make request:
                function (cb) {
                    userAgent1
                        .put(url)
                         .send(data)
                         .end(function (err, res) {
                            if (err) {
                                return cb(err);
                            }
                        
                            expect(res.status).to.equals(200);
                            expect(res.body).to.have.property('success');
                            expect(res.body).to.have.property('message');
                            expect(res.body.message).to.include(RESPONSES.SET_LOCATION);
                        
                            cb(null, res);
                        });

                },

                //check db:
                function (res, cb) {
                    var criteria = {
                        deviceId: deviceId
                    };

                    DeviceModel.findOne(criteria, function (err, deviceModel) {
                        if (err) {
                            return cb(err);
                        }
                       
                        expect(deviceModel).to.be.instanceOf(Object);
                        expect(deviceModel).to.have.property('lastLocation');
                        expect(deviceModel.lastLocation).to.have.property('coordinates');
                        expect(deviceModel.lastLocation.coordinates).to.be.instanceOf(Array);
                        expect(deviceModel.lastLocation.coordinates).to.have.length(2);
                        expect(deviceModel.lastLocation.coordinates[0]).to.equals(long);
                        expect(deviceModel.lastLocation.coordinates[1]).to.equals(lat);

                        cb();
                    });
                }

            ], function (err) {
                if (err) {
                    return done(err);
                }
                done();
            });
        });

        it('User can be informed on leave the geoFence', function (done) {
            var deviceId = 'dev_9';
            var long = 60.321;
            var lat = 12.3456;
            var data = {
                minderId: 'minder_1',
                deviceId: deviceId,
                location: {
                    long: long,
                    lat: lat
                }
            };
            
            async.waterfall([
                
                //make request:
                function (cb) {
                    userAgent1
                        .put(url)
                         .send(data)
                         .end(function (err, res) {
                        if (err) {
                            return cb(err);
                        }
                        
                        expect(res.status).to.equals(200);
                        expect(res.body).to.have.property('success');
                        expect(res.body).to.have.property('message');
                        expect(res.body.message).to.include(RESPONSES.GEO_FENCE_LEAVE);
                        
                        cb(null, res);
                    });

                },

                //check db:
                function (res, cb) {
                    var criteria = {
                        deviceId: deviceId
                    };
                    
                    DeviceModel.findOne(criteria, function (err, deviceModel) {
                        if (err) {
                            return cb(err);
                        }
                        
                        expect(deviceModel).to.be.instanceOf(Object);
                        expect(deviceModel).to.have.property('lastLocation');
                        expect(deviceModel.lastLocation).to.have.property('coordinates');
                        expect(deviceModel.lastLocation.coordinates).to.be.instanceOf(Array);
                        expect(deviceModel.lastLocation.coordinates).to.have.length(2);
                        expect(deviceModel.lastLocation.coordinates[0]).to.equals(long);
                        expect(deviceModel.lastLocation.coordinates[1]).to.equals(lat);

                        expect(deviceModel).to.have.property('geoFence');
                        expect(deviceModel.geoFence).to.have.property('withinFence');
                        expect(deviceModel.geoFence.withinFence).to.equals(false);
                        
                        cb();
                    });
                }
            ], function (err) {
                if (err) {
                    return done(err);
                }
                done();
            });
        });
        
        it('User can\'t be informed on leave the geoFence and withinFence=false', function (done) {
            var deviceId = 'dev_9';
            var long = 60.321;
            var lat = 12.3456;
            var data = {
                minderId: 'minder_1',
                deviceId: deviceId,
                location: {
                    long: long,
                    lat: lat
                }
            };
            
            async.waterfall([
                
                //make request:
                function (cb) {
                    userAgent1
                        .put(url)
                         .send(data)
                         .end(function (err, res) {
                        if (err) {
                            return cb(err);
                        }
                        
                        expect(res.status).to.equals(200);
                        expect(res.body).to.have.property('success');
                        expect(res.body).to.have.property('message');
                        expect(res.body.message).to.include(RESPONSES.SET_LOCATION);
                        
                        cb(null, res);
                    });

                },

                //check db:
                function (res, cb) {
                    var criteria = {
                        deviceId: deviceId
                    };
                    
                    DeviceModel.findOne(criteria, function (err, deviceModel) {
                        if (err) {
                            return cb(err);
                        }
                        
                        expect(deviceModel).to.be.instanceOf(Object);
                        expect(deviceModel).to.have.property('lastLocation');
                        expect(deviceModel.lastLocation).to.have.property('coordinates');
                        expect(deviceModel.lastLocation.coordinates).to.be.instanceOf(Array);
                        expect(deviceModel.lastLocation.coordinates).to.have.length(2);
                        expect(deviceModel.lastLocation.coordinates[0]).to.equals(long);
                        expect(deviceModel.lastLocation.coordinates[1]).to.equals(lat);
                        
                        expect(deviceModel).to.have.property('geoFence');
                        expect(deviceModel.geoFence).to.have.property('withinFence');
                        expect(deviceModel.geoFence.withinFence).to.equals(false);
                        
                        cb();
                    });
                }
            ], function (err) {
                if (err) {
                    return done(err);
                }
                done();
            });

        });

        it('User can be informed on return to the geoFence', function (done) {
            var deviceId = 'dev_9';
            var long = 60.321;
            var lat = 30.000;
            var data = {
                minderId: 'minder_1',
                deviceId: deviceId,
                location: {
                    long: long,
                    lat: lat
                }
            };
            
            async.waterfall([
                
                //make request:
                function (cb) {
                    userAgent1
                        .put(url)
                         .send(data)
                         .end(function (err, res) {
                        if (err) {
                            return cb(err);
                        }
                        
                        expect(res.status).to.equals(200);
                        expect(res.body).to.have.property('success');
                        expect(res.body).to.have.property('message');
                        expect(res.body.message).to.include(RESPONSES.GEO_FENCE_RETURN);
                        
                        cb(null, res);
                    });

                },

                //check db:
                function (res, cb) {
                    var criteria = {
                        deviceId: deviceId
                    };
                    
                    DeviceModel.findOne(criteria, function (err, deviceModel) {
                        if (err) {
                            return cb(err);
                        }
                        
                        expect(deviceModel).to.be.instanceOf(Object);
                        expect(deviceModel).to.have.property('lastLocation');
                        expect(deviceModel.lastLocation).to.have.property('coordinates');
                        expect(deviceModel.lastLocation.coordinates).to.be.instanceOf(Array);
                        expect(deviceModel.lastLocation.coordinates).to.have.length(2);
                        expect(deviceModel.lastLocation.coordinates[0]).to.equals(long);
                        expect(deviceModel.lastLocation.coordinates[1]).to.equals(lat);
                        
                        expect(deviceModel).to.have.property('geoFence');
                        expect(deviceModel.geoFence).to.have.property('withinFence');
                        expect(deviceModel.geoFence.withinFence).to.equals(true);
                        
                        cb();
                    });
                }
            ], function (err) {
                if (err) {
                    return done(err);
                }
                done();
            });
        });

        it('Can\'t inform the user on leave geoFence if enabled=false', function (done) {
            var data = {
                minderId: 'minder_1',
                deviceId: 'dev_10',
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
                    return done(err);
                }
                
                expect(res.status).to.equals(200);
                expect(res.body).to.have.property('success');
                expect(res.body).to.have.property('message');
                expect(res.body.message).to.include(RESPONSES.SET_LOCATION);

                done();
                
            });
        });

    });
});