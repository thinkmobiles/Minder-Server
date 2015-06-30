'use strict';
var path = require('path');

process.env.HOST = 'http://localhost:8877';
process.env.PORT = 8877;
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'minderTest';

process.env.mailerService = 'Gmail';
process.env.mailerUserName = 'istvan.nazarovits.dev@gmail.com';
process.env.mailerPassword = 'thinkmobiles365';

//process.env.RECAPTCHA_PRIVATE_KEY = '6Lfy2QUTAAAAABrXwHIJsv-r_n5bWkGXOQ31j0aI';
process.env.RECAPTCHA_PRIVATE_KEY = '6LfjdgcTAAAAAMrVBNi0qg49V0HRG9XgntCfFJHC';

//file uploader
process.env.UPLOADER_TYPE = 'FileSystem'; //FileSystem || AmazonS3
/*
process.env.BUCKET = 'uploads_' + process.env.NODE_ENV.toLowerCase();
process.env.FILES_BUCKET = 'files';
*/
process.env.BUCKET = path.join('uploads', process.env.NODE_ENV.toLowerCase());
process.env.FILES_BUCKET = 'sync';