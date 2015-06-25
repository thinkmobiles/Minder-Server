var aws = {};
aws['awsRootUrl'] = 's3.amazonaws.com';
aws['bucketName'] = process.env.BUCKET;
aws['accessKeyId'] = process.env.AMAZON_ACCESS_KEY_ID;
aws['secretAccessKey'] = process.env.AMAZON_SECRET_ACCESS_KEY;
var now = new Date();
var delta = 1000 * 60 * 60 * 24 * 365 * 2;
aws['imageExpiry'] = new Date(now + delta);
aws['imageUrlDurationSec'] = 60 * 60 * 24 * 30;
//aws['imageUrlDurationSec'] = delta;

module.exports = aws;