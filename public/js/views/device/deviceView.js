define([
    'text!templates/device/deviceTemplate.html',
    'models/deviceModel',
    'validation',
    'constants/statuses'

], function (template, DeviceModel, validation, STATUSES) {

    var View;
    View = Backbone.View.extend({

        initialize: function (myMod) {
            this.setThisStateModel();
            this.stateModel.set({id : myMod.id});

            this.getDevice();

            // keep actual
            //this.listenTo(this.stateModel, 'change', this.render);

            this.render();
        },

        events: {
            'click #editButton': 'update',
            'click #deleteButton': 'deviceDelete',
            'keydown': 'keydownHandler'
        },

        // remove the old model of this view ... and remove event listeners from it
        cleanPageData:function(){
            if (this.model) {
                this.stopListening(this.model);
                this.model = null;
            }
            this.setThisStateModel();
        },

        keydownHandler: function (e) {
            switch (e.which) {
                case 13:
                    this.update(e);
                    break;
                default:
                    break;
            }
        },

        // clean this view StateModel
        setThisStateModel:function(){
            var defaultData = {
                errors:null,
                messages:null
            };

            if(this.stateModel){
                this.stateModel.set(defaultData);
            }else{
                this.stateModel = new Backbone.Model(defaultData);
            }

        },

        // remove old model on router hook
        afterUpend: function () {
            this.cleanPageData();
        },

        // get device by url id
        setParams: function (params) {
            this.stateModel.set(params);
            this.getDevice()
        },

        hideDialog: function () {
            $('#editDeviceModal').modal('hide');
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open');

        },

        // get device from serer or from devices view collection collection
        getDevice: function () {
            var device = null;
            var self = this;

            // get already exist  model
            if (App.router.devicesView) {
                device = App.router.devicesView.devisesCollection.find(function (model) {
                    if (model.id === self.stateModel.get('id')) {
                        return true;
                    }
                })
            }

            // get it from the server if is a new tab
            if (!device) {
                device = new DeviceModel({
                    _id: this.stateModel.get('id')
                });
                device.fetch();

            }

            this.model = device;

            // set events on it
            this.listenTo(this.model, 'change', function () {
                self.render();
            });

            this.render();
        },

        deviceDelete: function (event) {
            if (!confirm('Are you sure you want to delete this device?')) {
                return
            }
            var self = this;
            event.preventDefault();

            this.model.save({
                status: STATUSES.DELETED
            }, {
                patch: true,
                success: function () {
                    self.cleanPageData();
                    self.hideDialog();
                    //Backbone.history.navigate('logIn',{trigger : true});
                }
            });

        },

        // save changes
        update: function (event) {
            var self = this;
            var errors = [];
            var messages = [];
            var stateModelUpdate;
            event.preventDefault();

            stateModelUpdate = {
                errors: false,
                messages: false,
                name: this.$el.find("#name").val().trim()
            };

            this.stateModel.set(stateModelUpdate);


            // validate user input

            //validation.checkNameField(messages, true, stateModelUpdate.name, 'name');

            if (errors.length > 0 || messages.length > 0) {
                if (errors.length > 0) {
                    stateModelUpdate.errors = errors;
                }
                if (messages.length > 0) {
                    stateModelUpdate.messages = messages;
                }
                this.stateModel.set(stateModelUpdate);
                // if have errors or messages show it and prevent query to server
                this.render();  //-----------------
                return this;
            }

            this.model.save({
                name: stateModelUpdate.name
                },{
                success:function(){
                    //alert('Updated successfully');
                    self.cleanPageData();
                    self.hideDialog();

                },
                error:function(err){
                    self.stateModel.set({
                        errors: [err.responseJSON.error]
                    });
                    //App.error(err);
                }
            });
        },

        render: function () {
            var self =this;
            var data = this.stateModel.toJSON();

            if (this.model) {
                // concat current name inserted by user with model data
                data = _.extend(this.model.toJSON(), data);
            }

            this.$el.html(_.template(template, data));

            return this;
        }
    });

    return View;

});


