/**
 * Created by Roman on 01.04.2015.
 */
//var subdomainHelper = require('../helpers/subdomain.js');
var RESPONSES = ('../constants/responses');
var mongoose = require('mongoose');
var crypto = require('crypto');
var geoip = require('geoip-lite');

var Saas = function (mainDb) {
    var dbRegistrator = require('../helpers/dbRegistrator.js')(mainDb);

    this.forgotPass = function (req, res, next) {
        var SaasSchema = mongoose.Schemas['Saas'];
        var Saas = mainDb.model('Saas', SaasSchema);
        var body = req.body;
        //var subdomainObject = subdomainHelper(req);
        var email = body.email;
        var err;

        if (subdomainObject.main && !subdomainObject.accountName) {
            err = new Error(RESPONSES.INVALID_COMPANY_NAME);
            err.status = 400;

            next(err);
        } else if (subdomainObject.accountName) {
            Saas.findOne({DBname: subdomainObject.accountName}, function (err, company) {
                if (err) {
                    return next(err);
                } else if (company && company._id) {
                    err = new Error('Company with same name already registred');
                    err.status = 400;

                    return next(err);
                } else {
                    req.session.loggedIn = true;
                    res.status(200).send({success: "You can use this subdomain"});
                }
            });
        }
    };

    this.register = function (req, res, next) {
        var SaasSchema = mongoose.Schemas['Saas'];
        var Saas = mainDb.model('Saas', SaasSchema);
        var body = req.body;
        var shaSum = crypto.createHash('sha256');
        var subdomainObject = subdomainHelper(req);
        var email = body.email || 'testUser@easyerp.com';
        var password = body.password;
        var ip = req.ip;
        var geo = geoip.lookup(ip);

        console.log(ip);

        shaSum.update(password);
        password = shaSum.digest('hex');

        dbRegistrator(req, subdomainObject.accountName, body, function (err, connection) {
            if (err) {
                return next(err);
            }

            mainDb.dbsObject[subdomainObject.accountName] = connection;
            saas = new Saas();
            saas.DBname = subdomainObject.accountName;
            saas._id = subdomainObject.accountName;
            saas.user = email;
            saas.ip = ip;
            saas.geo = geo;
            saas.pass = password;
            saas.save(function (err, saasDb) {
                if (err) {
                    return next(err);
                }
                res.redirect(301, '/');
            });
        });
    };

    this.check = function (req, res, next) {
        var SaasSchema = mongoose.Schemas['Saas'];
        var Saas = mainDb.model('Saas', SaasSchema);
        var subdomainObject = subdomainHelper(req);
        var err;

        if (subdomainObject.main && !subdomainObject.accountName) {
            err = new Error(RESPONSES.INVALID_COMPANY_NAME);
            err.status = 400;

            next(err);
        } else if (subdomainObject.accountName) {
            Saas.findOne({DBname: subdomainObject.accountName}, function (err, company) {
                if (err) {
                    return next(err);
                } else if (company && company._id) {
                    err = new Error('Company with same name already registred');
                    err.status = 400;

                    return next(err);
                } else {
                    req.session.loggedIn = true;
                    res.status(200).send({success: "You can use this subdomain"});
                }
            });
        }
    };

    this.clientList = function (req, res, next) {
        var SaasSchema = mongoose.Schemas['Saas'];
        var Saas = mainDb.model('Saas', SaasSchema);

        Saas.findOne({}, {pass: -1}, function (err, saasDbs) {
            if (err) {
                return next(err);
            }

            res.status(200).send({success: saasDbs});
        });
    };

    this.accountLoad = function (req, res, next) {
        var SaasSchema = mongoose.Schemas['Saas'];
        var Saas = mainDb.model('Saas', SaasSchema);
        var data = req.body;
        var password = data.pass;
        var err;

        if ((data.login || data.email) && password) {
            var shaSum = crypto.createHash('sha256');

            shaSum.update(password);
            password = shaSum.digest('hex');
            Saas.findOne({user: data.email, pass: password}, function (err, saasDb) {
                if (err) {
                    return next(err);
                }
                if (!saasDb) {
                    err = new Error('Such saas account dose\'t exists');
                    err.status = 400;
                    return next(err);
                }

                res.status(200).send({accountName: saasDb.DBname});
            });
        } else {
            err = new Error(RESPONSES.INVALID_PARAMETERS);
            err.status = 400;
            next(err);
        }
    };

};

module.exports = Saas;
