define([
    'config/config',
    'views/customElements/mapInfowindow'
], function (config, MapInfowindow) {

    var View;
    View = Backbone.View.extend({
        el: '#map',

        initialize: function () {
            var self = this;

            // create the map
            self.initializeMap();
        },

        initializeMap: function () {
            var self = this;

            // set default params
            var mapOptions = {
                center: new google.maps.LatLng(0, 0),
                zoom: 2,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                minZoom:2,
                streetViewControl:false
            };

            // append the map
            this.map = new google.maps.Map(document.getElementById("map"), mapOptions);

            App.map = this.map;

            // keep map pretty
            google.maps.event.addDomListener(window, "resize", function () {
                var center = self.map.getCenter();
                google.maps.event.trigger(self.map, "resize");
                self.map.setCenter(center);
            });

            // create infoWindow for map
            this.mapInfowindowView = new MapInfowindow();
            App.mapInfowindowView = this.mapInfowindowView;
        }
    });

    return View;
});