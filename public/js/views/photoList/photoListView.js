/**
 * Created by andrey on 29.06.15.
 */

define([
    'text!templates/photoList/photoListTemplate.html'

], function (PhotoListTmpl) {

    var View;

    View = Backbone.View.extend({

        events: {

        },

        initialize: function () {

            this.render();
        },

        render: function () {
            this.$el.html(_.template(PhotoListTmpl));

            return this;
        }

    });
    return View;
});
