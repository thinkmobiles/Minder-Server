// Filename: communication.js
define(function () {
    var checkLogin = function (callback) {
        var url = "/currentUser";
        $.ajax({
            url: url,
            type: "GET",
            success: function (data) {
                return callback(null, data);
            },
            error: function (data) {
                return callback(data);
            }
        });
    }

    return {
        checkLogin: checkLogin
    }
});