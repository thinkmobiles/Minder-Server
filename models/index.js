'use strict';
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

Array.prototype.toObjectId = function () {
    var _arrayOfID = [];

    for (var i = 0; i < this.length; i++) {
        if (this[i] && typeof this[i] == 'object' && this[i].hasOwnProperty('_id')) {
            _arrayOfID.push(this[i]._id);
        } else {
            if (typeof this[i] == 'string' && this[i].length === 24) {
                _arrayOfID.push(ObjectId(this[i]));
            }
            if (this[i] === null) {
                _arrayOfID.push(null);
            }

        }
    }
    return _arrayOfID;
};

module.exports = (function () {
    require('./device.js');
    require('./user.js');
    require('./files.js');
    require('./tariffPlan.js');
})();