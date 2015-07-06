/**
 * Created by andrey on 29.06.15.
 */

define([
    'text!templates/photoList/photoListTemplate.html',
    'text!templates/customElements/pagPhotoTemplate.html'

], function (PhotoListTmpl, PagPhotoTmpl) {

    var View;

    View = Backbone.View.extend({
        el : "#photoListContainer",

        events: {

        },

        initialize: function (options) {
            var id = options.id;
            var currentUrl = "/sync/devices/" + id + "/files";
            var self = this;

            this.photosCollection = new Backbone.Collection;
            this.photosCollection.url = currentUrl;

            this.currentPhotosCollection = new Backbone.Collection;

            this.stateModel = new Backbone.Model({
                count         : 0,
                onPage        : 15,
                padding       : 2,
                page          : 1,
                ends          : true,
                steps         : true,
                url           : currentUrl,
                currentId     : id,
                pages         : []
            });

            this.photosCollection.fetch({
                reset : true,
                success : function(){
                    self.getPaginationCollection();
                }});
        },

        getPaginationCollection : function (){
            var count = this.photosCollection.length;
            var self = this;

            this.stateModel.set('count',count);

            this.currentPhotosCollection = this.photosCollection.clone();
            this.currentPhotosCollection.url = this.stateModel.get('url');

            this.currentPhotosCollection.fetch({
                data: {
                    page : this.stateModel.get('page'),
                    count: this.stateModel.get('onPage')
                },
                success : function (){
                    self.render()
                }
            });
        },

        setData: function (data) {
            this.stateModel.set({
                page: data.page
            });
            this.getPaginationCollection();
        },

        //count: function () {
        //    var self = this;
        //    var id = this.stateModel.get('currentId');
        //
        //        $.ajax({
        //            url: "/sync/devices/"+ id +"/files/count",
        //            type: "GET",
        //            success: function (response) {
        //                self.stateModel.set({
        //                    count: response.count
        //                });
        //                self.calculate();
        //            },
        //            error: function (err) {
        //                App.error(err);
        //            }
        //        })
        //},

        drawPagination: function () {
            var count  = this.stateModel.get('count') || 0;
            var onPage = this.stateModel.get('onPage');
            var paddingBefore = this.stateModel.get('padding');
            var paddingAfter  = this.stateModel.get('padding');
            var allPages = Math.ceil(count / onPage);
            var pages = [];
            var start = 1 ;
            var end   = 1 ;
            var ends  = this.stateModel.get('ends') ;
            var steps = this.stateModel.get('steps');
            var page  = this.stateModel.get('page') ;

            if ((page - paddingBefore) < 1) {
                start = 1;
            } else {
                start = page - paddingBefore;
            }
            if ((page + paddingAfter) < allPages) {
                end = page + paddingAfter;
            } else {
                end = allPages;
            }

            if (end - start < 1) {
                this.stateModel.set({
                    pages: []
                });
            } else {
                if (ends) {
                    pages.push({
                        html: "&lt;&lt;first",
                        data: 1,
                        clNam: true
                    });
                }
                if (steps) {
                    if (page < 2) {
                        pages.push({
                            html: "&lt;&lt;prev",
                            data: 1,
                            clNam: true
                        });
                    } else {
                        pages.push({
                            html: "&lt;&lt;prev",
                            data: page - 1,
                            clNam: true
                        });
                    }

                }

                for (; start <= end; start++) {
                    pages.push({
                        html  : start,
                        data  : start,
                        active: start === page
                    });
                }

                if (steps) {
                    if (page < allPages) {
                        pages.push({
                            html: 'next&gt;&gt;',
                            data: page + 1,
                            clNam: true
                        });
                    } else {
                        pages.push({
                            html: 'next&gt;&gt;',
                            data: allPages,
                            clNam: true
                        });
                    }

                }

                if (ends) {
                    pages.push({
                        html: 'last&gt;&gt;',
                        data: allPages,
                        clNam: true
                    });
                }
                this.stateModel.set({
                    pages: pages
                });
            }
            $('#paginationPhoto').html(_.template(PagPhotoTmpl,{pages : pages}))
        },

        render: function () {
            if (this.stateModel.get('count') > this.stateModel.get('onPage')){
                this.drawPagination()
            }

            var photoColl = this.currentPhotosCollection.toJSON();
            this.$el.html(_.template(PhotoListTmpl,{
                photoColl       : photoColl
            }));

            return this;
        }

    });
    return View;
});
