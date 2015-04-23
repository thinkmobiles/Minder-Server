// Filename: communication.js
define(function () {
    var checkLogin = function (callback) {
        var url = "/isAuth";
        $.ajax({
            url: url,
            type: "GET",
            success: function () {
                return callback(true);
            },
            error: function (data) {
                return callback(false);
            }
        });
    }

    return {
        checkLogin: checkLogin
    }
});