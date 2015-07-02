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

            this.render();
        },

        events: {
            'click #editButton'  : 'update',
            'click #deleteButton': 'deviceDelete',
            'keypress #name'     : 'saveOnEnter'
        },

        cleanPageData:function(){
            if (this.model) {
                this.stopListening(this.model);
                this.model = null;
            }
            this.setThisStateModel();
        },

        saveOnEnter: function (event) {
            if (event.keyCode === 13) {
                this.update(event);
            }
        },

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

        afterUpend: function () {
            this.cleanPageData();
        },

        setParams: function (params) {
            this.stateModel.set(params);
            this.getDevice()
        },

        hideDialog: function () {
            $('#editDeviceModal').modal('hide');
            $('.modal-backdrop').remove();
            $('body').removeClass('modal-open').style="";
            //$('body').style="";
            //this.trigger('customClose');

        },

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
                    self.cleanPageData();
                    self.hideDialog();
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

            this.undelegateEvents();
            this.$el.html(_.template(template, data));
            this.delegateEvents();

            return this;
        }
    });

    return View;

});


