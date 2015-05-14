define(function () {
    var MyModel = Backbone.Model.extend({
    });

    var MenuItems = Backbone.Collection.extend({
        model: MyModel,
        setCurrentModule: function (moduleName) {
            this.currentModule = moduleName;
            this.trigger('change:currentModule', this.currentModule, this);
        },
        currentModule: "main",
    });

    return MenuItems;
});
