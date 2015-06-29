/**
 * Created by andrey on 29.06.15.
 */

define([
    'models/photoModel'
], function (PhotoModel) {
    var Collection = Backbone.Collection.extend({
        model: PhotoModel,

        url: function () {
            return ;
        }
    });

    return Collection;
});