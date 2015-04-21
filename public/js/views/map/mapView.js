define(['config/config'], function (config) {

    var MainView = Backbone.View.extend({
        el: '#map',
        initialize: function (options) {
            var self = this;
            console.log(self);
            self.initializeMap();
        },
        stateModel: new Backbone.Model(),
        initializeMap: function () {
            var _this = this;
            console.log(google.maps.LatLng);
            var mapOptions = {
                center: new google.maps.LatLng(-34.397, 150.644),
                zoom: 8,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };

            this.map = new google.maps.Map(document.getElementById("map"), mapOptions);

            google.maps.event.addDomListener(window, "resize", function () {
                var center = _this.map.getCenter();
                google.maps.event.trigger(_this.map, "resize");
                _this.map.setCenter(center);
            });
        }

        //render: function () {
        //    this.$el.html(_.template(MainTemplate));
        //    return this;
        //}
    });
    return MainView;
});