define([
    'models/deviceModel'
], function (deviceModel) {
    var Collection = Backbone.Collection.extend({
        model: deviceModel,

        url: function () {
            return "/devices"
        }
    });

    return Collection;
});
