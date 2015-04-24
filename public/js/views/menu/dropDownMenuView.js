define([
    'text!templates/menu/menuDropDownTemplate.html',
    'views/menu/menuItemView'
], function (template, menuItemView) {

    var dropDownMenuItemView = Backbone.View.extend({
        tagName: 'li',
        className: 'dropdown',
        dropDownName: 'Dropdown',
        initialize: function (options) {
            var self = this;
            var collection = this.collection;
            if (options.dropDownName) this.dropDownName = options.dropDownName;
            this.views = [];
            this.render();
            this.renderMenuItems();

            //collection.map(function (model) {
            //    var view = new menuItemView({model: model});
            //    self.$el.find('.dropdown-menu').append(view.render().el);
            //});

            //this.topMenuLeftItemsCollection.map(function (model) {
            //    console.log('>>>>>>', model.get('administrator') === App.sessionData.get('admin'));
            //    if (model.get('administrator') === App.sessionData.get('admin') && App.sessionData.get('authorized')) {
            //        var view = new menuItemView({model: model});
            //        _this.views.push(view);
            //        _this.$('#topMenuLeft').append(view.render().el);
            //        return
            //    }
            //    if (model.get('authorized') === App.sessionData.get('authorized') && !model.get('administrator')) {
            //        var view = new menuItemView({model: model});
            //        _this.views.push(view);
            //        _this.$('#topMenuLeft').append(view.render().el);
            //        return
            //    }
            //
            //});
        },
        template: _.template(template),

        render: function () {
            this.$el.html(this.template({
                dropDownName: this.dropDownName
            }));
            return this;
        },

        renderMenuItems: function () {
            var _this = this;
            _.each(this.views, function (view) {
                view.remove();
            });


            this.collection.map(function (model) {
                console.log('>>>>>>', model.get('administrator') === App.sessionData.get('admin'));
                if (model.get('administrator') === App.sessionData.get('admin') && App.sessionData.get('authorized')) {
                    var view = new menuItemView({model: model});
                    _this.views.push(view);
                    _this.$('.dropdown-menu').append(view.render().el);
                    return
                }
                if (model.get('authorized') === App.sessionData.get('authorized') && !model.get('administrator')) {
                    var view = new menuItemView({model: model});
                    _this.views.push(view);
                    _this.$('.dropdown-menu').append(view.render().el);
                    return
                }

            });
            return this;
        },

        //render: function () {
        //    var _this = this;
        //    this.$el.html(_.template(topMenuTemplate));
        //    this.renderMenuItems();
        //    return this;
        //}
    });
    return dropDownMenuItemView;
});
