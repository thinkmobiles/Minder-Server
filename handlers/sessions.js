'use strict';

var USER_ROLES = require('../constants/userRoles');
var SESSION_ADMIN = 'admin';
var SESSION_USER = 'user';

var Session = function (db) {

    this.register = function (req, res, userModel, options) {
        var status = (options && options.status) ? options.status : 200;
        var role;

        if (userModel.get('role') === USER_ROLES.ADMIN) {
            role = SESSION_ADMIN;
        } else {
            role = SESSION_USER;
        }

        req.session.loggedIn = true;
        req.session.userId = userModel._id;
        req.session.userRole = role;

        if (process.env.NODE_ENV === 'test') {
            res.status(status).send({
                success: "Login successful",
                user: userModel
            });
        } else {
            res.status(status).send({success: "Login successful", user: userModel});
        }

    };

    this.kill = function (req, res, next) {

        if (req.session && req.session.userId) {
            req.session.destroy();
        }

        res.status(200).send({success: 'Logout successful'});
    };

    this.authenticatedUser = function (req, res, next) {
        if (req.session && req.session.userId && req.session.loggedIn) {
            next();
        } else {
            var err = new Error('Unauthorized');
            err.status = 401;
            next(err);
        }
    };

    this.isAuthenticatedUser = function (req, res, next) {
        if (req.session && req.session.userId && req.session.loggedIn) {
            res.status(200).send();
        } else {
            var err = new Error('Unauthorized');
            err.status = 401;
            next(err);
        }
    };

    this.authenticatedAdmin = function (req, res, next) {
        if (req.session && req.session.userId && req.session.loggedIn && (req.session.userRole === SESSION_ADMIN)) {
            next();
        } else {
            var err = new Error('Forbidden');
            err.status = 403;
            next(err);
        }
    };

    this.isAuthenticatedAdmin = function (req, res, next) {
        if (req.session && req.session.userId && req.session.loggedIn && (req.session.userRole === SESSION_ADMIN)) {
            res.status(200).send();
        } else {
            var err = new Error('Forbidden');
            err.status = 403;
            next(err);
        }
    };

    this.isAdmin = function (req) {
        if (req.session && req.session.userId && req.session.loggedIn && (req.session.userRole === SESSION_ADMIN)) {
            return true;
        } else {
            return false;
        }
    };

};

module.exports = Session;