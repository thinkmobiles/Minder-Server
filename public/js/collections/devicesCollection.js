define([
    'models/deviceModel'
], function (deviceModel) {
    var Collection = Backbone.Collection.extend({
        model: deviceModel,

        url: function () {
            return "/devices"
        },

        initialize: function () {
            //console.log('menu items collection init');
        }
    });

    return Collection;
});
