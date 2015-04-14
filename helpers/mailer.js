/**
 * Created by soundstorm on 14.04.15.
 */
module.exports = function (app) {
    var _ = require('../public/js/libs/underscore-min.js');
    var nodemailer = require("nodemailer");
    var smtpTransport = require('nodemailer-smtp-transport');
    var fs = require('fs');

    this.forgotPassword = function (options){
        var templateOptions = {
            name: options.firstname + ' ' + options.lastname,
            email: options.email,
            url: 'http://localhost:8823/users/changePassword?forgotToken=' + options.forgotToken
        };
        var mailOptions = {
            from: 'Test',
            to: options.email,
            subject: 'Change password',
            generateTextFromHTML: true,
            html: _.template(fs.readFileSync('public/templates/mailer/forgotPassword.html', encoding = "utf8"), templateOptions)
        };

        deliver(mailOptions);
    };

    this.changePassword = function (options){
        var templateOptions = {
            name: options.firstname + ' ' + options.lastname,
            email: options.email,
            password: options.password,
            url: 'http://localhost:8823'
        };
        var mailOptions = {
            from: 'Test',
            to: options.email,
            subject: 'Change password',
            generateTextFromHTML: true,
            html: _.template(fs.readFileSync('public/templates/mailer/changePassword.html', encoding = "utf8"), templateOptions)
        };

        deliver(mailOptions);
    };

    this.sendMemberPassword = function (options){
        var templateOptions = {
            name: options.firstname + ' ' + options.lastname,
            email: options.email,
            password: options.password,
            id: options.id
        };
        var mailOptions = {
            from: 'Test',
            to: options.email,
            subject: 'Change password',
            generateTextFromHTML: true,
            html: _.template(fs.readFileSync('public/templates/mailer/sendMembersPassword.html', encoding = "utf8"), templateOptions)
        };

        deliver(mailOptions);
    };

    function deliver(mailOptions, cb) {
        var transport = nodemailer.createTransport(smtpTransport({
            service: 'gmail',
            auth: {
                user: "gogi.gogishvili",
                pass: "gogi123456789"
            }
        }));

        transport.sendMail(mailOptions, function (err, response) {
            if (err) {
                console.log(err);
                if (cb && (typeof cb === 'function')) {
                    cb(err, null);
                }
            } else {
                console.log("Message sent: " + response.message);
                if (cb && (typeof cb === 'function')) {
                    cb(null, response);
                }
            }
        });
    }

};

