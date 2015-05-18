define([
    'text!templates/customElements/mapInfowindowTemplate.html',
], function (template) {

    var View;
    View = Backbone.View.extend({

        initialize: function () {
            var self = this;

            this.stateModel = new Backbone.Model({
                address: '',
                updatedAt: ''
            });

            // keep data actual
            this.listenTo(this.stateModel, 'change', this.updateData);

            this.infowindow = new google.maps.InfoWindow({ // google maps infoWindow object
                content: ''
            });
            google.maps.event.addListener(App.map, 'click', function () { // close windows by clicking on map
                self.infowindow.close();
            });
        },

        // render window content
        updateData: function () { // render the infoWindow content
            this.infowindow.setContent(_.template(template, this.stateModel.toJSON()));
        },

        setDeviceInfoWindow: function (model, marker) {  // set the content and position of window
            var self = this;

            //format date
            this.stateModel.set({
                updateDate: moment(model.get('lastLocation').dateTime).format('YYYY/MM/DD HH:mm:ss')
            });

            // concat the model and the stateModel data and set the marker
            // and set the marker position
            // and set the content
            // and use the cashed address

            // if address exist show it
            // if not get it
            // and show window
            if (model.get('address')) {
                self.stateModel.set({
                    address: model.get('address')
                });
                this.stateModel.set(_.extend(this.stateModel.toJSON(), model.toJSON()));
                this.updateData();
                this.infowindow.open(marker.get('map'), marker);
                return;
            }

            // the same but get the address
            this.stateModel.set(_.extend(this.stateModel.toJSON(), model.toJSON()));

            self.stateModel.set({
                address: ''
            });

            this.updateData();

            this.infowindow.open(marker.get('map'), marker); // get the address by google geocode
            $.ajax({
                url: 'http://maps.googleapis.com/maps/api/geocode/json?latlng=' + model.get('lastLocation').lat + ',' + model.get('lastLocation').long + '&sensor=false',
                dataType: "json",
                success: function (result) {
                    if (result.status === 'OK') {
                        self.stateModel.set({
                            address: result.results[0].formatted_address,
                            modelId: model.id
                        });
                        model.set({
                            // catch the address on model for traffic economy
                            address: result.results[0].formatted_address
                        })
                    } else {
                        self.stateModel.set({
                            address: '' // set empty address if is not exist
                        })
                    }
                },
                error: function (err) {
                    App.error(err); // global error handler
                }
            })
        }
    });

    return View;

});
