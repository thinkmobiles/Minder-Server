define([
    'text!templates/customElements/paginationTemplate.html'
], function (template) {

    var View;
    View = Backbone.View.extend({

        initialize: function (options) {
            var self = this;

            // set the default page if it not set
            if (options.page < 1) {
                options.page = 1;
            }

            // set the settings of pagination
            this.stateModel = new Backbone.Model({
                count: 0, // count of items in collection
                onPage: options.onPage || 10, // set the items on 1 page
                page: options.page || 1, // set the page number
                padding: options.padding || 3, // set the padding before and after the page
                url: options.url || '', // set the url to go
                urlPagination: options.urlPagination || false, // make the pagination reload the page by router
                pages: [], // pages array for template
                ends: options.ends, // if true - quick ends linc
                steps: options.steps, //if true - quick nav linc
                data: options.data // filters for server
            });

            this.collection = options.collection; // collection to control

            self.count(); // cont the pages and fetch the current

            // cont the pages and fetch the current when the page parameter is changing
            this.stateModel.on('change:page', function () {
                self.count();
            });
        },

        tagName: 'nav',

        events: {
            'click .goToPage': 'goToPage'
        },

        // go to page in not url mode
        goToPage: function (event) {
            event.preventDefault();
            var page = event.currentTarget.getAttribute('value');
            page = parseInt(page);
            this.stateModel.set({
                page: page
            });
        },

        // get pages count
        count: function () {
            var self = this;
            $.ajax({
                url: "/devices/count",
                type: "GET",
                data: this.getFilters(),
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

        // prepare filters for fetch
        getFilters: function () {
            return _.extend({
                page: this.stateModel.get('page'),
                count: this.stateModel.get('onPage')
            }, this.stateModel.get('data'));
        },

        // fetch the data
        loadPage: function () {
            this.collection.fetch({
                data: this.getFilters()
            });
        },

        // refresh the current page if the parent view is need
        refresh: function () {
            this.count();
        },

        // generate pages array logic
        calculate: function () {
            var count = this.stateModel.get('count') || 0;
            var onPage = this.stateModel.get('onPage');
            var paddingBefore = this.stateModel.get('padding');
            var paddingAfter = this.stateModel.get('padding');
            var allPages = Math.ceil(count / onPage);
            var pages = [];
            var start = 1;
            var end = 1;
            var ends = this.stateModel.get('ends');
            var steps = this.stateModel.get('steps');
            var page = this.stateModel.get('page');

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
                        html: "first",
                        data: 1
                    });
                }
                if (steps) {
                    if (page < 2) {
                        pages.push({
                            html: "prev",
                            data: 1
                        });
                    } else {
                        pages.push({
                            html: "prev",
                            data: page - 1
                        });
                    }

                }

                for (; start <= end; start++) {
                    pages.push({
                        html: start,
                        data: start,
                        active: start === page
                    });
                }

                if (steps) {
                    if (page < allPages) {
                        pages.push({
                            html: 'next>>',
                            data: page + 1
                        });
                    } else {
                        pages.push({
                            html: 'next>>',
                            data: allPages
                        });
                    }

                }

                if (ends) {
                    pages.push({
                        html: 'last>>',
                        data: allPages
                    });
                }
                this.stateModel.set({
                    pages: pages
                });
            }
            this.loadPage(); // fetch
            this.render(); // render
        },

        // set the  filters by parent view (for search)
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
