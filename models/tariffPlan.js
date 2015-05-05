'use strict';

module.exports = (function () {
    var mongoose = require('mongoose');
    var ObjectId = mongoose.Schema.Types.ObjectId;
    var tariffPlanSchema = mongoose.Schema({
        id: {type: String, required: true, unique: true},
        name: {type: String, required: true, unique: true},
        amount: {type: Number, required: true},         // price (Cent)
        currency: {type: String, required: true},       // USD
        interval: {type: String, required: true},       // 'month' / 'year'
        metadata: {
            type: {type: String, required: true},       // 'month' / 'year'
            minDevices: {type: Number, required: true}, // 0
            maxDevices: {type: Number, required: true}  //
        },
        statement_descriptor: {type: String, required: true}, // ?
        createdAt: {type: Date, default: Date.now},
        updatedAt: {type: Date, default: Date.now}
    }, {collection: 'TariffPlans'});

    mongoose.model('TariffPlans', tariffPlanSchema);

    if (!mongoose.Schemas) {
        mongoose.Schemas = {};
    }

    mongoose.Schemas['TariffPlan'] = tariffPlanSchema;
})();