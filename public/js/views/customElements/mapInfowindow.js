define([
    'text!templates/customElements/mapInfowindowTemplate.html',
    'moment'
], function (template, moment) {

    var View = Backbone.View.extend({
        initialize: function (options) {
            var _this = this;
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
                _this.infowindow.close();
            });
        },
        setDeviceInfowindow: function (model, marker) {
            var _this = this;
            this.stateModel.set({
                //updatedAt: model.get('updatedAt')
                updatDate: moment(model.get('lastLocation').dateTime).format('YYYY/MM/DD HH:mm:ss')
            });
            if (model.get('address')) {
                _this.stateModel.set({
                    address: model.get('address')
                });
                this.stateModel.set(_.extend(this.stateModel.toJSON(), model.toJSON()));
                this.updateData();
                this.infowindow.open(marker.get('map'), marker);
                return;
            }


            //var data = model.toJSON();
            //data = _.extend(data, this.stateModel.toJSON());
            this.stateModel.set(_.extend(this.stateModel.toJSON(), model.toJSON()));
            _this.stateModel.set({
                address: ''
            });
            this.updateData();
            this.infowindow.open(marker.get('map'), marker);
            $.ajax({
                url: 'http://maps.googleapis.com/maps/api/geocode/json?latlng=' + model.get('lastLocation').lat + ',' + model.get('lastLocation').long + '&sensor=false',
                dataType: "json",
                success: function (result) {
                    ///console.log(result);
                    if (result.status === 'OK') {
                        _this.stateModel.set({
                            address: result.results[0].formatted_address,
                            modelId: model.id,
                        });
                        model.set({
                            address: result.results[0].formatted_address
                        })
                    } else {
                        _this.stateModel.set({
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
