define(function () {
    var MyModel = Backbone.Model.extend({
        //idAttribute: '_id'
    });

    var MenuItems = Backbone.Collection.extend({
        model: MyModel,

        //url: function () {
        //    return "/getModules"
        //},

        setCurrentModule: function (moduleName) {
            this.currentModule = moduleName;
            this.trigger('change:currentModule', this.currentModule, this);
        },
        currentModule: "main",
        initialize: function () {
            console.log('menu items collection init');
        }
    });

    return MenuItems;
});
