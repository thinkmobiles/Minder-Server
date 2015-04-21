var App = App ||
    {
        File: {
            MAXSIZE: 10485760,  //size in kilobytes  = 3 MB
            MaxFileSizeDisplay: "10 MB"
        },
        requestedURL: null,
        Calendar: {
            currentCalendarId: ""
        }
    };

require.config({
    paths: {
        jQuery: './libs/jquery-2.1.0.min.map',
        ajaxForm: './libs/jquery.form',
        Underscore: './libs/underscore-min.map.1.6.0',
        Bootstrap: './libs/bootstrap.min',
        Backbone: './libs/backbone-min.map.1.1.2',
        less: './libs/less.min',
        templates: '../templates',
        text: './libs/text',
        common: 'common'
    },
    shim: {
        'ajaxForm': ['jQuery'],
        'Bootstrap': ['jQuery'],
        'Backbone': ['Underscore', 'jQuery'],
        'app': ['Backbone', 'less', 'ajaxForm', 'Bootstrap']
    }
});

require(['app'], function (app) {
    Backbone.Collection.prototype.getElement = function (id) {
        return (id) ? this.get(id) : ((this.currentElement) ? this.currentElement : this.at(0));
    };
    Backbone.Collection.prototype.setElement = function (id, model) {
        if (arguments.length === 0) {
            this.currentElement = this.at(0);
        } else if (arguments.length === 2) {
            if (model) {
                this.currentElement = model;
            } else if (id) {
                this.currentElement = this.get(id);
            }
        } else {
            if ((typeof (id) == 'string') && id.length == 24) {
                this.currentElement = this.get(id);
            } else if (typeof (id) == 'object') {
                this.currentElement = id;
            }
        }

    };

    Backbone.View.prototype.errorNotification = function (xhr) {
        if (xhr) {
            if (xhr.status === 401 || xhr.status === 403) {
                if (xhr.status === 401) {
                    Backbone.history.navigate("login", {trigger: true});
                } else {
                    alert("You do not have permission to perform this action");
                }
            } else {
                if (xhr.responseJSON) {
                    alert(xhr.responseJSON.error);
                } else {
                    Backbone.history.navigate("home", {trigger: true});
                }
            }
        }
    };




    app.initialize();
});
