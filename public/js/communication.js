define(function () {
    var checkLogin = function (callback) {
        $.ajax({
            url: "/currentUser",
            type: "GET",
            success: function (data) {
                return callback(null, data);
            },
            error: function (data) {
                return callback(data);
            }
        });
    };

    return {
        checkLogin: checkLogin
    }
});