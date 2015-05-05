define([
    'text!templates/customElements/mapInfowindowTemplate.html',
    'moment'
], function (template, moment) {

    var View = Backbone.View.extend({
        initialize: function (options) {
            var self = this;
            this.stateModel = new Backbone.Model({
                address: '',
                updatedAt: ''
            });
            this.listenTo(this.stateModel, 'change', this.updateData);
            this.infowindow = new google.maps.InfoWindow({
                content: '',
                position: new google.maps.LatLng(-25.363882, 131.044922)
            });
            google.maps.event.addListener(App.map, 'click', function (e) {
                self.infowindow.close();
            });
        },
        setDeviceInfowindow: function (model, marker) {
            var self = this;
            this.stateModel.set({
                updatDate: moment(model.get('lastLocation').dateTime).format('YYYY/MM/DD HH:mm:ss')
            });
            if (model.get('address')) {
                self.stateModel.set({
                    address: model.get('address')
                });
                this.stateModel.set(_.extend(this.stateModel.toJSON(), model.toJSON()));
                this.updateData();
                this.infowindow.open(marker.get('map'), marker);
                return;
            }
            this.stateModel.set(_.extend(this.stateModel.toJSON(), model.toJSON()));
            self.stateModel.set({
                address: ''
            });
            this.updateData();
            this.infowindow.open(marker.get('map'), marker);
            $.ajax({
                url: 'http://maps.googleapis.com/maps/api/geocode/json?latlng=' + model.get('lastLocation').lat + ',' + model.get('lastLocation').long + '&sensor=false',
                dataType: "json",
                success: function (result) {
                    if (result.status === 'OK') {
                        self.stateModel.set({
                            address: result.results[0].formatted_address,
                            modelId: model.id,
                        });
                        model.set({
                            address: result.results[0].formatted_address
                        })
                    } else {
                        self.stateModel.set({
                            address: ''
                        })
                    }
                },
                error: function (err) {
                    App.error(err);
                }
            })
        },
        updateData: function () {
            this.infowindow.setContent(_.template(template, this.stateModel.toJSON()));
        }
    });

    return View;

});
