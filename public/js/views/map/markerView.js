define([
    'views/map/mapView',
    'config/config'
], function (mapView, config) {

    var View = Backbone.View.extend({
        initialize: function (options) {
            this.marker = null;
            //var self = this;
            //console.log(self);
            //self.initializeMap();
            this.render();
            this.stateModel = new Backbone.Model();
        },
        removeMarker: function () {
            if (this.marker) {
                this.marker.setMap(null);
            }
        },
        render: function () {
            if (!this.marker) {
                this.marker = new google.maps.Marker({
                    map: App.map,
                    icon: {
                        url: '/images/markers/default.png',
                        //size: new google.maps.Size(32, 32),
                        //origin: new google.maps.Point(0, 0),
                        //anchor: new google.maps.Point(32, 16)
                    },
                    title: this.model.get('name')
                });
            }
            var location = this.model.get('lastLocation');
            console.log('>>location', this.model);
            this.marker.setPosition(new google.maps.LatLng(location.lat, location.long));
            console.log('marker render', this);
            return this;
        }
    });
    return View;
});