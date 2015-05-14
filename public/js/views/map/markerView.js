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