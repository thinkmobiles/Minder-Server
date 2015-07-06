'use strict';

print('>>> changeSchemas ...');

//unset coordinates:
db.Devices.update({}, {$unset: {"lastLocation.coordinates": 1}}, {multi: true});

//create indexes:
db.Devices.ensureIndex({"lastLocation.coordinates": "2dsphere"});

//update coordinates
var cursor = db.Devices.find({});
cursor.forEach(function ( device ) {
    var lng = device.lastLocation.long;
    var lat = device.lastLocation.lat;
    var criteria = {
        _id: device._id
    };
    
    var update = {$set: {
        'lastLocation.coordinates': [lng, lat]
    },$unset: {
        'lastLocation.long': 1,
        'lastLocation.lat': 1
    }};
    
    db.Devices.update(criteria, update);
});

db.Devices.update({}, {$set: {"geoFence": {"enabled": false}}}, {multi: true});
db.Devices.update({}, {$set: {"sync": {
    "enabled": false
    "radius": 3000,
    "fixedLocation": {
        long: 0,
        lat: 0
    }
}}}, {multi: true});

print('>>> ... success');