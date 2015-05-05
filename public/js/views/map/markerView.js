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
            if (this.circle) {
                this.circle.setMap(null);
            }
        },
        render: function () {
            var self = this;
            if (!this.psition) {
                var location = this.model.get('lastLocation');
                this.psition = new google.maps.LatLng(location.lat, location.long);
            }
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
            if (this.model.get('accuracy')) {
                if (!this.circle) {
                    this.circle = new google.maps.Circle({
                        strokeColor: '#FF0000',
                        strokeOpacity: 0.8,
                        strokeWeight: 1,
                        fillColor: '#FF0000',
                        fillOpacity: 0.25,
                        map: App.map,
                        center: this.psition,
                        radius: this.model.get('accuracy')
                    });
                }
            }
            this.marker.setPosition(this.psition);

            google.maps.event.addListener(self.marker, 'click', function () {
                App.mapInfowindowView.setDeviceInfowindow(self.model, self.marker);
            });
            return this;
        }
    });
    return View;
});