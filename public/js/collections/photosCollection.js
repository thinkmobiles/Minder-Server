/**
 * Created by andrey on 29.06.15.
 */

define([
    'models/photoModel'
], function (PhotoModel) {
    var Collection = Backbone.Collection.extend({
        model: PhotoModel,

        url: function () {
            if (this.get('id')) {
                return "/sync/devices/" + this.get('id') + "/files";
            }
        },

        initialize: function(){
            this.fetch({reset: true});
        }
    });

    return Collection;
});