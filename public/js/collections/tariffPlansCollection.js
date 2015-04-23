define([
    'models/tariffPlanModel'
], function (model) {
    var Collection = Backbone.Collection.extend({
        model: model,
        url: function () {
            return "/tariffPlans"
        }
    });

    return Collection;
});
