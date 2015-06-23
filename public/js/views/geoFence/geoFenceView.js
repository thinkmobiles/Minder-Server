/**
 * Created by andrey on 23.06.15.
 */

define([
    'text!templates/geoFence/geoFenceTemplate.html',
    'views/map/mapView'
], function (GeoFenceTmpl, MapView) {

    var View;

    View = Backbone.View.extend({

        events: {
            "click #setRadius" : "changeRadius",
            "click #saveChanges" : "drawMap"
        },

        initialize: function () {

            this.currentModel = new Backbone.Model({
                radius : '0'
            });


            this.render();
        },

        changeRadius : function (){
            var radius = this.$el.find('#radius').val().trim();
            this.currentModel.set({radius : radius});
        },

        drawMap : function(){
            //var self = this;
            var mapOptions = {
                center: new google.maps.LatLng(0, 0),
                zoom: 2,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                minZoom:2,
                streetViewControl:false
            };

            this.map = new google.maps.Map(document.getElementById("map_container"), mapOptions);

        },

        render: function () {

            this.$el.html(_.template(GeoFenceTmpl));
            //this.drowMap();

            return this;
        }

    });
    return View;
});
