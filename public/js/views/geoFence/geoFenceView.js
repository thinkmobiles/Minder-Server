/**
 * Created by andrey on 23.06.15.
 */

define([
    'text!templates/geoFence/geoFenceTemplate.html',
    'models/deviceModel'
], function (GeoFenceTmpl, DeviceModel) {

    var View;

    View = Backbone.View.extend({
        //el : '#modalEditGeoFenceContent',

        events: {
            "click  #setRadius"   : "changeRadius",
            "click  #saveChanges" : "saveDevice"
        },

        initialize: function (options) {
            var id= options.id;
            var self = this;

            this.stateModel = new DeviceModel({
                _id: id
            });
            this.stateModel.fetch({
                success: function(model){
                    self.model = model;
                    self.render();
                },
                error: function(err){
                    alert(err.toString);
                }
            });

        },

        changeRadius : function (){
            var radius = this.$el.find('#radius').val().trim();
            this.model.set({radius : radius});

            this.circle.setRadius(+radius);
        },

        saveDevice : function(){
            var saveData = {
                    enabled : this.$el.find('#check_fence').val(),
                    fixedLocation: {
                        long  : this.circle.getCenter().lng(),
                        lat   : this.circle.getCenter().lat()
                        },
                    radius : this.$el.find('#radius').val().trim()
                };
            this.model.url = '/devices/geoFence/'+this.model.get('_id');
            this.model.save(saveData,{
                wait : true,
                success : function(){alert('success')},
                error   : function(){alert('error')}
            });
        },

        on_MapClick : function(loc){
            this.marker.setPosition(loc);
            this.circle.setCenter(loc);
        },

        initializeGeoMap : function(){
            var self = this;
            var mapOptions = {
                center: new google.maps.LatLng(0, 0),
                zoom: 2,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                minZoom:2,
                streetViewControl:false
            };

            this.map = new google.maps.Map(document.getElementById("map_container"), mapOptions);

            this.marker = new google.maps.Marker({
                map: self.map,
                icon: {
                    url: '/images/markers/default.png'
                }
            });

            var circleOptions = {
                strokeColor : '#FF0000',
                strokeWeight: 1.5      ,
                fillopacity : 1,
                map         : this.map ,
                radius      : +this.model.get('geoFence.radius'),
                editable    : true,
                clickable   : false
            };

            this.circle = new google.maps.Circle(circleOptions);

            google.maps.event.addListener(self.map, 'click', function(e){self.on_MapClick(e.latLng)});
            google.maps.event.addListener(self.circle, 'bounds_changed', function(){
                var loc = self.circle.getCenter();
                var radius = self.circle.getRadius();
                if (radius) {
                    self.$el.find('#radius').val(radius.toFixed(2));
                }

                self.marker.setPosition(loc);
            });
        },

        render: function () {
            var modelForTMPL = this.model.toJSON();
            this.$el.html(_.template(GeoFenceTmpl , {model : modelForTMPL}));

            this.initializeGeoMap();

            return this;
        }

    });
    return View;
});
