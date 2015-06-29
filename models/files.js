'use strict';

var uploaderConfig;
var amazonS3conf;

if (process.env.UPLOADER_TYPE === 'AmazonS3') {
    amazonS3conf = require('../config/aws');
    uploaderConfig = {
        type: process.env.UPLOADER_TYPE,
        awsConfig: amazonS3conf
    };
} else {
    uploaderConfig = {
        type: process.env.UPLOADER_TYPE,
        directory: process.env.BUCKET
    };
}

module.exports = (function () {
    var mongoose = require('mongoose');
    var ObjectId = mongoose.Schema.Types.ObjectId;
    var imageUploader = require('../helpers/imageUploader/imageUploader')(uploaderConfig);

    var fileSchema = mongoose.Schema({
        device: {type: ObjectId, ref: 'Devices'},
        originalName: {type: String, default: ''}, //the file name on the device
        name: {type: String, default: ''},
        key: {type: String, default: ''},
        size: {type: Number, default: 0},
        path: {type: String, default: ''}, //the file path on the mobile device
        //url: {type: String, default: ''},
        createdAt: {type: Date, default: Date.now},
        updatedAt: {type: Date, default: Date.now}
    }, {collection: 'Files'});

    mongoose.model('File', fileSchema);

    fileSchema.uploader = imageUploader;
    fileSchema.methods.getImageUrl = imageUploader.getImageUrl;
    fileSchema.methods.generateImageUrl = function () {
        return imageUploader.generateImageUrl(this.name, this.key);
    };
    fileSchema.virtual('url').get(function () {
        return imageUploader.getImageUrl(this.name, this.key);
    });
    fileSchema.set('toJSON', { getters: true, virtuals: true });

    if (!mongoose.Schemas) {
        mongoose.Schemas = {};
    }

    mongoose.Schemas['File'] = fileSchema;

    if (process.env.NODE_ENV !== 'production') {
        fileSchema.set('autoIndex', false);
    }

})();