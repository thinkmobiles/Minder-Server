'use strict';

module.exports = (function () {
    var mongoose = require('mongoose');
    var ObjectId = mongoose.Schema.Types.ObjectId;

    //var tariffPlanSchema = mongoose.Schema({
    //    name: {type: String, required: true},
    //    description: {type: String, required: true, default: ''},
    //    cost: {type: Number, required: true},
    //    minDevices: {type: Number, required: true},
    //    maxDevices: {type: Number, required: true},
    //    createdAt: {type: Date, default: Date.now},
    //    updatedAt: {type: Date, default: Date.now}
    //}, {collection: 'TariffPlans'});


    var tariffPlanSchema = mongoose.Schema({
    id: {type: String, required: true, unique: true},
    name: {type: String, required: true, unique: true},
    amount:  {type: Number, required: true},
    currency: {type: String, required: true},
    interval: {type: String, required: true},
    metadata: {
        type: {type: String, required: true},
        minDevices:  {type: Number, required: true},
        maxDevices:  {type: Number, required: true}
        },
    statement_descriptor: {type: String, required: true}
    }, {collection: 'TariffPlans'});


    mongoose.model('TariffPlans', tariffPlanSchema);

    if (!mongoose.Schemas) {
        mongoose.Schemas = {};
    }

    mongoose.Schemas['TariffPlan'] = tariffPlanSchema;
})();