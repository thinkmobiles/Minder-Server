define([
    'text!templates/customElements/paginationTemplate.html'
], function (template) {

    var View = Backbone.View.extend({

        initialize: function (options) {
            var self = this;



            if(options.el){
                this.el = options.el;
            }

            if (options.page < 1){
                options.page = 1;
            }

            this.stateModel = new Backbone.Model({
                count: 0,
                onPage: options.onPage || 10,
                page: options.page || 1,
                padding: options.padding || 3,
                url: options.url || '',
                urlPagination: options.urlPagination || false,
                pages: [],
                ends: options.ends,
                steps: options.steps,
                data: options.data,
                countSelector:options.countSelector
            });

            this.collection = options.collection;

            self.count();

            this.stateModel.on('change:page', function (func) {
                self.count();
            });
        },

        tagName: 'nav',

        events: {
            'click .goToPage': 'goToPage'
        },


        goToPage:function(event){
            event.preventDefault();
           var page =  event.currentTarget.getAttribute('value');
            page = parseInt(page);
            console.log('>>',page, typeof page);
            this.stateModel.set({
                page:page
            });
        },

        count: function (cb) {
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

        getFilters: function () {
            return _.extend({
                page: this.stateModel.get('page'),
                count: this.stateModel.get('onPage')
            }, this.stateModel.get('data'));
        },

        loadPage: function (sb) {
            this.collection.fetch({
                data: this.getFilters()
            });
        },
        refresh:function(){
            this.count();
        },

        calculate: function () {
            var count = this.stateModel.get('count') || 0;
            var onPage = this.stateModel.get('onPage');
            var paddingBiffore = this.stateModel.get('padding');
            var paddingafter = this.stateModel.get('padding');
            var allPages = Math.ceil(count / onPage);
            var pages = [];
            var start = 1;
            var end = 1;
            var ends = this.stateModel.get('ends');
            var steps = this.stateModel.get('steps');
            var page = this.stateModel.get('page');

            if ((page - paddingBiffore) < 1) {
                start = 1;
            } else {
                start = page - paddingBiffore;
            }
            if ((page + paddingafter) < allPages) {
                end = page + paddingafter;
            } else {
                end = allPages;
            }

            if(end-start <2){
                this.stateModel.set({
                    pages: []
                });
            } else {
                if (ends) {
                    pages.push({
                        html: '<<',
                        data: 1
                    });
                }
                if(steps){
                    if(page < 2){
                        pages.push({
                            html: '<',
                            data: 1
                        });
                    }else{
                        pages.push({
                            html: '<',
                            data: page -1
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

                if(steps){
                    if(page  < allPages){
                        pages.push({
                            html: '>',
                            data: page + 1
                        });
                    }else{
                        pages.push({
                            html: '>',
                            data: allPages
                        });
                    }

                }

                if (ends) {
                    pages.push({
                        html: '>>',
                        data: allPages
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
