/**
 * Created by andrey on 23.06.15.
 */

define([
    'text!templates/geoFence/geoFenceTemplate.html',
    'models/deviceModel',
    'views/photoList/photoListView'

], function (GeoFenceTmpl, DeviceModel, PhotoListView) {

    var View;

    View = Backbone.View.extend({


        events: {
            "click  #setRadius"    : "changeRadius",
            "click  #saveChanges"  : "saveDeviceFence",
            "click  #editButton"   : "saveDeviceName",
            "click  #modalTabs a"  : "changeTabs",
            'click  .goToPage'     : "goToPage"
        },

        initialize: function (options) {
            var id= options.id;
            var self = this;

            this.stateModel = new DeviceModel({
                _id: id
            });

            this.stateModel.fetch({
                success: function(){
                    self.render();
                },
                error: function(err){
                    alert(err.toString);
                }
            });

        },

        goToPage: function (event) {
            event.preventDefault();
            var page = event.currentTarget.getAttribute('value');
            page = parseInt(page);
            this.photoListView.setData({
                page: page
            });
        },

        changeTabs : function(event){
            event.preventDefault();
            var target = $(event.target);
            var container = $('#modalTabs');
            var container2 = $('#modalTabs-items');
            var n;

            container.find('.active').removeClass('active');
            target.addClass('active');

            n = container.find('li').index(target.parent());

            container2.find('.openTab').removeClass('openTab');
            container2.find('.modalTabs-item').eq(n).addClass('openTab');

            if (n === 1 && !this.map) {
                this.initializeGeoMap();
            }
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

        saveDeviceFence : function(){
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
                this.stateModel.url = '/devices/' + this.stateModel.get('_id') + '/geoFence';
                this.stateModel.save({geoFence: saveData}, {
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

        saveDeviceName : function(){
            var newName = this.$el.find('#name').val().trim();

            if (this.stateModel.get('name') != newName){
                this.stateModel.url = "/devices/" + this.stateModel.get('_id');
                this.stateModel.save({name: newName}, {
                    wait: true,
                    success: function () {
                        $('.activeN').text(newName);
                    },
                    error: function () {
                        alert('error')
                    }
                });
            }
        },

        saveDevice : function (){
            var self = this;
            var newName = this.$el.find('#name').val().trim();
            var resCenter = this.circle.getCenter();
            var saveData;

            if (resCenter) {
                saveData = {
                    geoFence : {
                        enabled: this.$el.find('#check_fence').prop('checked'),
                        fixedLocation: {
                            long: resCenter.lng(),
                            lat: resCenter.lat()
                        },
                        radius: this.$el.find('#radius').val().trim()
                    }
                };
            }

            saveData.name = newName;
            saveData.sync = {enabled : this.$el.find('#check_photo').prop('checked')};

            this.stateModel.url = '/devices/' + this.stateModel.get('_id');
            this.stateModel.save(saveData, {
                wait: true,
                success: function () {
                    $('.activeN').text(newName);
                    self.hideDialog();
                },
                error: function () {
                    alert('error')
                }
            });
        },

        on_MapClick : function(loc){
            this.marker.setPosition(loc);
            this.circle.setCenter(loc);
        },

        initializeGeoMap : function(){
            var self = this;
            var startLat=this.stateModel.get('geoFence').fixedLocation.lat;
            var startLng=this.stateModel.get('geoFence').fixedLocation.long;

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
                strokeWeight: 1.5,
                fillopacity : 1,
                map         : this.map ,
                radius      : +this.stateModel.get('geoFence').radius,
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
            var modId = this.stateModel.get('_id');
            var modelForTMPL = this.stateModel.toJSON();

            this.undelegateEvents();
            this.$el.html(_.template(GeoFenceTmpl , {
                model : modelForTMPL
            }));
            this.delegateEvents();

            if (this.photoListView){this.photoListView.undelegateEvents()}
            this.photoListView = new PhotoListView({id : modId});

            return this;
        }

    });
    return View;
});
