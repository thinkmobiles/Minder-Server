'use strict';

print('>>> changeSchemas ...');

//unset coordinates:
// db.Devices.update({}, {$unset: {"lastLocation.coordinates": 1}}, {multi: true});

// //create indexes:
// db.Devices.ensureIndex({"lastLocation.coordinates": "2dsphere"});

 //update coordinates
 var cursor = db.Devices.find({"user": ObjectId("5596e43cc5a228580b000001")});
 cursor.forEach(function ( device ) {
     var lng = Math.random()*80;
     var lat = Math.random()*80;
     var criteria = {
         _id : device._id
     };
     var update = {$set: {
         'lastLocation.coordinates': [lng, lat]
     }};
    
     db.Devices.update(criteria, update);
 });

//var criteria = {};
//var update = {$set: {
    
    //"geoFence.enabled": false,
    //"geoFence.radius": 3000,
//    "geoFence.fixedLocation": {long: 0, lat: 0},
//    "geoFence.status": 1
//
//}};
//db.Devices.update(criteria, update, {multi: true});


// var users = db.Devices.aggregate([{
    // $group: {
        // _id: "$user", 
        // count: {$sum: 1}, 
        // devices: {$push:"$_id"}
    // }
// }]);

// users.forEach(function (user) {
    // var criteria = {
        // _id: user._id
    // };
    // var update = {
        // $set: {
            // devices: user.devices
        // }
    // }
    
    // db.Users.update(criteria, update, {mutli: true});
// });

print('>>> ... success');

//TODO: unsubscribe on stripe if status changed to 0;
//TODOL unsubscribe on stripe if expired plan;
