/**
 * Created by andrey on 29.06.15.
 */

define([
    'text!templates/photoList/photoListTemplate.html',
    'views/customElements/paginationView'

], function (PhotoListTmpl, PaginationView) {

    var View;

    View = Backbone.View.extend({
        el : "#photoListContainer",

        events: {

        },

        initialize: function (options) {
            var id = options.id;
            var self = this;

            this.photosCollection = new Backbone.Collection;

            this.paginatioInfo = {
                onPage        : 2,
                padding       : 2,
                page          : 1,
                ends          : true,
                steps         : true,
                url           : '/sync/devices/'+id+'/files',
                isItPhoto     : id
            };

            this.photosCollection.url = "/sync/devices/" + id + "/files";
            this.photosCollection.fetch({
                reset : true,
                success : function(){
                    self.render();
                }});


        },

        render: function () {
            var photoColl = this.photosCollection.toJSON();
            this.$el.html(_.template(PhotoListTmpl,{photoColl : photoColl}));

            var paginatioInfo = this.paginatioInfo;
            paginatioInfo.collection = this.photosCollection;

            this.paginationView = new PaginationView(paginatioInfo);
            this.$el.find('#pagination').append(this.paginationView.render().$el);

            return this;
        }

    });
    return View;
});
