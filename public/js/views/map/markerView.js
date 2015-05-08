define(function () {

    var View;
    View = Backbone.View.extend({
        initialize: function () {
            this.marker = null;

            this.render();
        },

        // remove marker from map
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

            // if marker not exist create it
            if (!this.marker) {
                this.marker = new google.maps.Marker({
                    map: App.map,
                    icon: {
                        url: '/images/markers/default.png'
                    },
                    title: this.model.get('name')
                });
            }

            // if accuracy show it
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

            // update marker position
            this.marker.setPosition(this.psition);

            google.maps.event.addListener(self.marker, 'click', function () {
                App.mapInfowindowView.setDeviceInfoWindow(self.model, self.marker);
            });
            return this;
        }
    });
    return View;
});