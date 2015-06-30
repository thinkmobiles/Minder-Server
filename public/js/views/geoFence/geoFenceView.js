/**
 * Created by andrey on 23.06.15.
 */

define([
    'text!templates/geoFence/geoFenceTemplate.html',
    'models/deviceModel'
], function (GeoFenceTmpl, DeviceModel) {

    var View;

    View = Backbone.View.extend({


        events: {
            "click  #setRadius"   : "changeRadius",
            "click  #saveChanges" : "saveDevice",
            "click  #bootTest"    : "initializeGeoMap"
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
            this.circle.setRadius(+radius);
        },

        hideDialog: function () {
            $('#editGeoFenceModal').modal('hide');
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open').style="";
        },

        saveDevice : function(){
            var self = this;
            var resCenter = this.circle.getCenter();
            if (resCenter) {
                var saveData = {
                    enabled: this.$el.find('#check_fence').prop('checked'),
                    fixedLocation: {
                        long: resCenter.lng(),
                        lat : resCenter.lat()
                    },
                    radius  : this.$el.find('#radius').val().trim()
                };
                this.model.url = '/devices/' + this.model.get('_id') + '/geoFence';
                this.model.save({geoFence: saveData}, {
                    wait: true,
                    success: function () {
                        self.hideDialog();
                    },
                    error: function () {
                        alert('error')
                    }
                });
            } else {
                alert('Enter some data');
            }
        },

        on_MapClick : function(loc){
            this.marker.setPosition(loc);
            this.circle.setCenter(loc);
        },

        initializeGeoMap : function(){
            var self = this;
            var startLat=this.model.get('geoFence').fixedLocation.lat;
            var startLng=this.model.get('geoFence').fixedLocation.long;

            var mapOptions = {
                center    : new google.maps.LatLng(startLat ? startLat : 0,startLng ? startLng : 0),
                zoom      : 2,
                mapTypeId : google.maps.MapTypeId.ROADMAP,
                minZoom   : 2,
                streetViewControl:false
            };

            this.map = new google.maps.Map(document.getElementById("map_container"), mapOptions);

            var markerOptions={
                map: self.map,
                icon: {
                    url: '/images/markers/default.png'
                }
            };
            var circleOptions = {
                strokeColor : '#FF0000',
                strokeWeight: 1.5      ,
                fillopacity : 1,
                map         : this.map ,
                radius      : +this.model.get('geoFence').radius,
                editable    : true,
                clickable   : false
            };

            if (startLat && startLng){
                markerOptions.position = new google.maps.LatLng(startLat, startLng);
                circleOptions.center   = new google.maps.LatLng(startLat, startLng);

            }
            this.marker = new google.maps.Marker(markerOptions);
            this.circle = new google.maps.Circle(circleOptions);

            if (startLat && startLng){
                this.map.fitBounds(this.circle.getBounds());
            }

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

            this.undelegateEvents();
            this.$el.html(_.template(GeoFenceTmpl , {model : modelForTMPL}));
            this.delegateEvents();

            this.initializeGeoMap();

            return this;
        }

    });
    return View;
});
