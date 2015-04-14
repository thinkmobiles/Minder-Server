define([
    'text!templates/Clients/TopBarTemplate.html',
    'custom',
    'common'
],
    function (ContentTopBarTemplate, Custom, Common) {
        var TopBarView = Backbone.View.extend({
            el: '#top-bar',
            contentType: "Clients",
            actionType: null,
            collectionLength: 0,
            template: _.template(ContentTopBarTemplate),

           /* events: {

            },*/

            initialize: function (options) {
                this.actionType = options.actionType;

                if (options.collection) {
                    this.collection = options.collection;
                    this.collection.bind('reset', _.bind(this.render, this));
                }
                this.render();
            },

            render: function () {
                $('title').text(this.contentType);
                var viewType = Custom.getCurrentVT();
                this.$el.html(this.template({ viewType: viewType, contentType: this.contentType }));
                Common.displayControlBtnsByActionType('Content', viewType);
                return this;
            }
        });

        return TopBarView;
    });
