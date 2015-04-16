define(['config/config'], function (config) {

    var MainView = Backbone.View.extend({
        el: '#map',
        initialize: function (options) {
            var self = this;


            console.log(self);

            //var scriptFile = document.createElement('script');
            //scriptFile.src = "https://maps.googleapis.com/maps/api/js?v=3.exp";
            //document.head.appendChild(scriptFile);
            //scriptFile.onload = function () {
            //    console.log(self);
            //    self.initializeMap();
            //};
            self.initializeMap();
            //initialize();
            //this.render();
        },

        initializeMap: function () {
            console.log(google.maps.LatLng);
            var mapOptions = {
                center: new google.maps.LatLng(-34.397, 150.644),
                zoom: 8,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };
            var map = new google.maps.Map(document.getElementById("map"),
                mapOptions);
        }

        //render: function () {
        //    this.$el.html(_.template(MainTemplate));
        //    return this;
        //}
    });
    return MainView;
});