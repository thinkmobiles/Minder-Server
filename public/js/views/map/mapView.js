define([
    'config/config',
    'views/customElements/mapInfowindow'
], function (config, MapInfowindow) {

    var MainView = Backbone.View.extend({
        el: '#map',
        initialize: function (options) {
            var self = this;
            self.initializeMap();
        },
        stateModel: new Backbone.Model(),
        initializeMap: function () {
            var _this = this;
            var mapOptions = {
                center: new google.maps.LatLng(0, 0),
                zoom: 2,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };
            this.map = new google.maps.Map(document.getElementById("map"), mapOptions);
            App.map = this.map;

            google.maps.event.addDomListener(window, "resize", function () {
                var center = _this.map.getCenter();
                google.maps.event.trigger(_this.map, "resize");
                _this.map.setCenter(center);
            });

            this.mapInfowindowView = new MapInfowindow();
            App.mapInfowindowView = this.mapInfowindowView;
        }

        //render: function () {
        //    this.$el.html(_.template(MainTemplate));
        //    return this;
        //}
    });
    return MainView;
});