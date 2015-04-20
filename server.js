var mongoose = require('mongoose');
var app;
var mainDb;
//var mainAppConfig = require('./config/main').mainApp;
var dbsObject = {};
var dbsNames = {};

if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'development';
}

//require('./config/' + mainAppConfig.NODE_ENV);
require('./config/' + process.env.NODE_ENV);
//process.env.NODE_ENV = mainAppConfig.NODE_ENV;

//var mainDb = mongoose.createConnection('localhost', 'minderDB');
//mainDb = mongoose.createConnection(process.env.DB_HOST, process.env.DB_NAME, {db:{native_parser: true}});
//mainDb = mongoose.createConnection('mongodb://localhost/minderDev');

mongoose.connect(process.env.DB_HOST, process.env.DB_NAME);
mainDb = mongoose.connection;
mainDb.on('error', console.error.bind(console, 'connection error:'));
mainDb.once('open', function callback () {
    mainDb.dbsObject = dbsObject;
    console.log('Connection to ' + process.env.DB_HOST +'/' + process.env.DB_NAME + ' is success');

    require('./models/index.js');

    var sessionSchema = mongoose.Schema({
        _id: String,
        session: String,
        expires: Date
    }, {collection: 'sessions'});

    var main = mainDb.model('sessions', sessionSchema);
    var port = process.env.PORT || 8877;

    main.find().exec(function (err, result) {
        var dbsForConnect;

        if (err) {
            console.error('Something went wrong in main server');
            return process.exit(1);
        }

        /*dbsForConnect = sessionParser(result, dbsObject);

        Saas.find({DBname: {$in: dbsForConnect}}, function (err, result) {
            if (!err && result.length) {
                result.forEach(function (_db) {
                    var dbObject = mongoose.createConnection(_db.url, _db.DBname);

                    dbObject.on('error', console.error.bind(console, 'connection error:'));
                    dbObject.once('open', function callback () {
                        console.log("Connection to " + _db.DBname + " is success");

                        dbsObject[_db.DBname] = dbObject;
                    });
                });
            }
        });*/
    });


    mainDb.mongoose = mongoose;

    app = require('./app')(mainDb, dbsNames);

    app.listen(port, function () {
        console.log('==============================================================');
        console.log('|| server start success on port=' + port + ' in ' + process.env.NODE_ENV + ' version ||');
        console.log('==============================================================\n');
    });
});

module.exports = {
    db: mainDb
};
