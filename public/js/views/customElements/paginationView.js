define([
    'text!templates/customElements/paginationTemplate.html'
], function (template) {

    var View = Backbone.View.extend({
        initialize: function (options) {
            var _this = this;
            if (options.page < 1) options.page = 1;
            this.stateModel = new Backbone.Model({
                count: 0,
                onPage: options.onPage || 10,
                page: options.page || 1,
                padding: options.padding || 3,
                url: options.url || '',
                pages: [],
                ends: options.page || true,
                data: options.data
            });
            this.collection = options.collection;
            _this.count();

            this.stateModel.on('change:page', function (func) {
                _this.count();
            });
            this.stateModel.on('change:data', function (func) {
                console.log('pagination----', func);
            });
        },
        tagName: 'nav',
        events: {
            //'click .deviseMainPageCheck': 'updateCheck',
            //'click': 'updateCheck'
        },

        count: function (cb) {
            var _this = this;
            $.ajax({
                url: "/devices/count",
                type: "GET",
                data: this.getFilters(),
                success: function (response) {
                    _this.stateModel.set({
                        count: response.count
                    });
                    _this.calculate();
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

        calculate: function () {
            var count = this.stateModel.get('count') || 0;
            var onPage = this.stateModel.get('onPage');
            var paddingBiffore = this.stateModel.get('padding');
            var paddingafter = this.stateModel.get('padding');
            var allPages = Math.ceil(count / onPage);
            var pages = [];
            var range = 0;
            var start = 1;
            var end = 1;
            var ends = this.stateModel.get('ends');
            var page = this.stateModel.get('page');

            if ((paddingBiffore + paddingafter + 1) > allPages) {
                range = allPages;
            } else {
                range = (paddingBiffore + paddingafter + 1);
            }

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

            if (ends) {
                pages.push({
                    html: '<<',
                    data: '1'
                });
            }

            for (; start <= end; start++) {
                pages.push({
                    html: start,
                    data: start,
                    active: start === page
                });
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
            this.loadPage();
            this.render();
        },

        setData: function (data) {
            console.log('setData', data);
            this.stateModel.set({
                data: data,
                page: 1
            });
            console.log('setData==', this.stateModel.toJSON());
            this.count();
        },

        render: function () {
            var data = this.stateModel.toJSON();
            //data = _.extend(data, this.model.toJSON());
            this.$el.html(_.template(template, data));
            return this;
        }
    });

    return View;

});
