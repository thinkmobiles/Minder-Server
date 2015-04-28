define([
    'text!templates/contactMap/contactMapTemplate.html'
], function (template) {

    var View = Backbone.View.extend({
        initialize: function (options) {
            var self = this;
            this.$el = options.$domElement;
            this.render(options);
            self.initializeMap(options);
            this.stateModel= new Backbone.Model();
        },

        initializeMap: function (options) {
            var self = this;
            geocoder = new google.maps.Geocoder();
            var mapOptions = {
                scrollwheel: false,
                center: new google.maps.LatLng(options.lat || -34.397, options.lng || 150.644),
                zoom: options.zoom || 8,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };
            this.map = new google.maps.Map(this.$el.find('.contactMap').get(0), mapOptions);

            function codeAddress(options) {
                geocoder.geocode({'address': options.address}, function (results, status) {
                    if (status == google.maps.GeocoderStatus.OK) {
                        self.map.setCenter(results[0].geometry.location);
                        var marker = new google.maps.Marker({
                            map: self.map,
                            position: results[0].geometry.location
                        });
                    } else {
                        alert('Geocode was not successful for the following reason: ' + status);
                    }
                });
            }

            if (options.address) {
                codeAddress(options);
            }

            this.marker = new google.maps.Marker({
                position: this.map.getCenter(),
                map: this.map
            });
        },
        render: function () {
            this.$el.html(_.template(template));
            return this
        }
    });
    return View;
});