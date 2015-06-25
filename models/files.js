'use strict';

module.exports = (function () {
    var mongoose = require('mongoose');
    var ObjectId = mongoose.Schema.Types.ObjectId;

    var fileSchema = mongoose.Schema({
        device: {type: ObjectId, ref: 'Devices'},
        name: {type: String, default: ''},
        key: {type: String, default: ''},
        size: {type: Number, default: 0},
        path: {type: String, default: ''},
        url: {type: String, default: ''},
        createdAt: {type: Date, default: Date.now},
        updatedAt: {type: Date, default: Date.now}
    }, {collection: 'Files'});

    mongoose.model('File', fileSchema);

    if (!mongoose.Schemas) {
        mongoose.Schemas = {};
    }

    mongoose.Schemas['File'] = fileSchema;

    if (process.env.NODE_ENV !== 'production') {
        fileSchema.set('autoIndex', false);
    }

})();