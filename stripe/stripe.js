'use strict';



var commander = require('commander');
var stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
var tariffPlans = require('./tariffPlans');
var util = require('util');

var _ = require('lodash');

function log(data) {
    console.log(util.inspect(data, {
        colors: true,
        depth: 5
    }));
};


commander
    .version('0.0.1')
    .option('-c, --create', 'Create tariff plans')
    .option('-l, --list', 'List tariff plans')
    .option('-u, --update', 'Update: name, metadata, statement_descriptor')
    .option('-d, --delete', 'Delete tariff plans!!! Only for development')
    .option('-j, --json', 'Show json plans')
    .option('-b, --database', 'Use database instead of stripe')
    .parse(process.argv);


if (commander.database) {
    var mongoose = require('mongoose');
    //var server = require('../server');
    //var db = server.db;

    if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'development';
    }

    require('../config/' + process.env.NODE_ENV);

    mongoose.connect(process.env.DB_HOST, process.env.DB_NAME);
    var db = mongoose.connection;


    db.once('open', function callback() {
        console.log('Connection to ' + process.env.DB_HOST + '/' + process.env.DB_NAME + ' is success');

        require('../models/index.js');
        var tariffPlanSchema = mongoose.Schemas['TariffPlan'];
        var TariffPlan = db.model('TariffPlan', tariffPlanSchema);


        if (commander.create) {
            for (var i = 0; i < tariffPlans.length; i++) {
                var newPlan = new TariffPlan(tariffPlans[i]);
                newPlan.save(function (err) {
                    if (err) {
                        return log(err);
                    }
                    log(('created plan plan'));

                });
            }
        }

        if (commander.update) {
            for (var i = 0; i < tariffPlans.length; i++) {
                TariffPlan.findOne({id: tariffPlans[i].id}, function (err, plan) {
                    if (err) {
                        return log(err);
                    }
                    var tarif = _.find(tariffPlans, function (elem) {
                        if (elem.id === plan.id) {
                            return true
                        }
                    });
                    if (!tarif) {
                        log(new Error());
                    }
                    plan.name = tarif.name;
                    plan.metadata = tarif.metadata;
                    plan.statement_descriptor = tarif.statement_descriptor;
                    plan.save(function (err) {
                        if (err) {
                            return log(err);
                        }
                        log('plan updated');
                    });
                })
            }
        }

        if (commander.list) {
            TariffPlan.find({}, function (err, plans) {
                if (err) {
                    return log(err);
                }
                log(plans);
            })
        }

        if (commander.delete) {
            TariffPlan.remove({}, function (err) {
                if (err) {
                    return log(err);
                }
                log('remove all plans');
            });
        }


    });











}


if (commander.update && !commander.database) {
    for (var i = 0; i < tariffPlans.length; i++) {
        stripe.plans.update(tariffPlans[i].id, {
            name: tariffPlans[i].name,
            metadata: tariffPlans[i].metadata,
            statement_descriptor: tariffPlans[i].statement_descriptor
        }, function (err, plan) {
            if (err) {
                console.log('>>> Error!');
                return log(err);
            }
            log(plan);
        });
    }
}

if (commander.create && !commander.database) {
    for (var i = 0; i < tariffPlans.length; i++) {
        stripe.plans.create(tariffPlans[i], function (err, plan) {
            if (err) {
                console.log('>>> Error!');
                return log(err);
            }
            log(plan);
        });
    }
}

if (commander.json && !commander.database) {
    log(tariffPlans);
}

if (commander.list && !commander.database) {
    stripe.plans.list(
        {limit: 100},
        function (err, plans) {
            if (err) {
                return log(err);
            }
            log(plans);
        }
    );
}

if (commander.delete && !commander.database) {
    for (var i = 0; i < tariffPlans.length; i++) {
        stripe.plans.del(tariffPlans[i].id, function (err, plan) {
            if (err) {
                console.log('>>> Error!');
                return log(err);
            }
            log(plan);
        });
    }
}

if (commander.create) return;
if (commander.json) return;
if (commander.list) return;
if (commander.update) return;
if (commander.delete) return;
if (commander.database) return;


console.log('Please choose on option, see --help')



















