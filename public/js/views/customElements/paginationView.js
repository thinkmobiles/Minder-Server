define([
    'text!templates/customElements/paginationTemplate.html'
], function (template) {

    var View;
    View = Backbone.View.extend({

        initialize: function (options) {
            var self = this;

            if (options.page < 1) {
                options.page = 1;
            }

            this.stateModel = new Backbone.Model({
                count         : 0,
                onPage        : options.onPage  || 10,
                page          : options.page    || 1,
                padding       : options.padding || 3,
                url           : options.url     || '',
                urlPagination : options.urlPagination || false,
                ends          : options.ends,
                steps         : options.steps,
                data          : options.data,
                pages         : []
            });

            this.collection = options.collection;

            self.count();

            this.stateModel.on('change:page', function () {
                self.count();
            });
        },

        tagName: 'nav',

        events: {
            'click .goToPage' : 'goToPage'
        },

        goToPage: function (event) {
            event.preventDefault();
            var page = event.currentTarget.getAttribute('value');
            page = parseInt(page);
            this.stateModel.set({
                page: page
            });
        },

        count: function () {
            var self = this;
            $.ajax({
                url   : "/devices/count",
                type  : "GET",
                data  : this.getFilters(),

                success: function (response) {
                    self.stateModel.set({
                        count: response.count
                    });
                    self.calculate();
                },
                error: function (err) {
                    App.error(err);
                }
            });
        },

        getFilters: function () {
            return _.extend({
                page  : this.stateModel.get('page'),
                count : this.stateModel.get('onPage')
            }, this.stateModel.get('data'));
        },

        loadPage: function () {
            this.collection.fetch({
                data: this.getFilters()
            });
        },

        refresh: function () {
            this.count();
        },

        calculate: function () {
            var count  = this.stateModel.get('count') || 0;
            var onPage = this.stateModel.get('onPage');
            var paddingBefore = this.stateModel.get('padding');
            var paddingAfter  = this.stateModel.get('padding');
            var allPages      = Math.ceil(count / onPage);
            var pages = [];
            var start = 1;
            var end   = 1;
            var ends  = this.stateModel.get('ends');
            var steps = this.stateModel.get('steps');
            var page  = this.stateModel.get('page');

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
                        html  : "&lt;&lt;first",
                        data  : 1,
                        clNam : true
                    });
                }
                if (steps) {
                    if (page < 2) {
                        pages.push({
                            html  : "&lt;&lt;prev",
                            data  : 1,
                            clNam : true
                        });
                    } else {
                        pages.push({
                            html  : "&lt;&lt;prev",
                            data  : page - 1,
                            clNam : true
                        });
                    }

                }

                for (; start <= end; start++) {
                    pages.push({
                        html   : start,
                        data   : start,
                        active : start === page
                    });
                }

                if (steps) {
                    if (page < allPages) {
                        pages.push({
                            html  : 'next&gt;&gt;',
                            data  : page + 1,
                            clNam : true
                        });
                    } else {
                        pages.push({
                            html  : 'next&gt;&gt;',
                            data  : allPages,
                            clNam : true
                        });
                    }

                }

                if (ends) {
                    pages.push({
                        html   : 'last&gt;&gt;',
                        data   : allPages,
                        clNam  : true
                    });
                }
                this.stateModel.set({
                    pages: pages
                });
            }

            this.loadPage();
            this.render();
        },

        setData: function (data) {
            this.stateModel.set({
                data: data,
                page: 1
            });
            this.count();
        },

        render: function () {
            var data = this.stateModel.toJSON();

            this.undelegateEvents();
            this.$el.html(_.template(template, data));
            this.delegateEvents();

            return this;
        }
    });

    return View;

});
