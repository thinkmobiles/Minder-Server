'use strict';

var MailerModule = function () {
    var _ = require('./../public/js/libs/underscore-min.map.1.6.0.js');
    var nodemailer = require("nodemailer");
    var fs = require('fs');
    var FROM = "Minder <" + 'info@minderweb.com' + ">";

    this.emailConfirmation = function (options) {
        var templateOptions = {
            name: options.firstName + ' ' + options.lastName,
            email: options.email,
            minderId: (options.minderId) ? options.minderId : null,
            url: process.env.HOST + '/confirmEmail/' + options.confirmToken
        };



        var mailOptions = {
            from: FROM,
            to: options.email,
            subject: 'Please verify your MinderWeb account',
            generateTextFromHTML: true,
            html: _.template(fs.readFileSync('public/templates/mailer/confirmEmail.html', 'utf8'), templateOptions)

        };

        deliver(mailOptions);
    };

    function deliver(mailOptions, callback) {
        var user = process.env.mailerUserName;
        var pass = process.env.mailerPassword;
        var service = process.env.mailerService;
        var smtpTransport = nodemailer.createTransport({
            service: service,
            auth: {
                user: user,
                pass: pass
            }
        });

        if (process.env.NODE_ENV !== 'production') {
            console.log(service, user, pass);
        }

        smtpTransport.sendMail(mailOptions, function (err, responseResult) {
            if (err) {
                if (callback && typeof callback === 'function') {
                    callback(err, null);
                }
                if (process.env.NODE_ENV !== 'production') {
                    console.error(err);
                }
            } else {
                if (callback && typeof callback === 'function') {
                    callback(null, responseResult);
                }
                if (process.env.NODE_ENV !== 'production') {
                    console.log('Message sent: ' + responseResult.response);
                }
            }
        });
    }

};

module.exports = new MailerModule();