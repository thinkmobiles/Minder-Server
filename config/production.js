'use strict';
var path = require('path');

process.env.HOST = 'http://134.249.164.53:8877';
process.env.PORT = 8877;
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'minderProdTest';

/*process.env.mailerService = 'Gmail';
process.env.mailerUserName = 'istvan.nazarovits.dev@gmail.com';
process.env.mailerPassword = 'thinkmobiles365';*/

process.env.mailerService = 'SendGrid';
process.env.mailerUserName = 'istvan.nazarovits';
process.env.mailerPassword = 'sendGridpassw365';

//process.env.RECAPTCHA_PRIVATE_KEY = '6Lfy2QUTAAAAABrXwHIJsv-r_n5bWkGXOQ31j0aI';
process.env.RECAPTCHA_PRIVATE_KEY = '6LfjdgcTAAAAAMrVBNi0qg49V0HRG9XgntCfFJHC';
//process.env.STRIPE_PRIVATE_KEY = 'sk_test_AZd2W2bGj2cM1r4x9kywC8oG';
process.env.STRIPE_PRIVATE_KEY = 'sk_test_94bnoDRl6nHuWHXbfRqk50yH'; //istvan.nazarovits@gmail.com / 1q2w3e4r

//file uploader
process.env.UPLOADER_TYPE = 'FileSystem'; //FileSystem || AmazonS3
//process.env.BUCKET = 'uploads_' + process.env.NODE_ENV.toLowerCase();
process.env.BUCKET = path.join('uploads', process.env.NODE_ENV.toLowerCase());
//process.env.BUCKET = path.join('uploads', 'test');
process.env.FILES_BUCKET = path.join('sync');