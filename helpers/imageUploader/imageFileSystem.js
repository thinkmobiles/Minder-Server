var imagesUploader = function (dirConfig) {
    "use strict";

    var rootDir = dirConfig;

    var defaultUploadsDir = 'uploads';
    var defaultImageDir = 'images';

    var fs = require('fs');
    var os = require('os');

    var osPathData = getDirAndSlash();

    function getDirAndSlash() {
        var osType = (os.type().split('_')[0]);
        var slash;
        var dir, webDir;
        switch (osType) {
            case "Windows":
            {
                //dir = __dirname.replace("modules\\custom\\imageUploader", rootDir + "\\");
                //dir = 'public\\';
                dir = dirConfig.replace("\/", "//");
                webDir = process.env.HOST;
                slash = "\\";
            }
                break;
            case "Linux":
            {
                //dir = __dirname.replace("modules/custom/imageUploader", rootDir + "\/");
                //dir = 'public\/';
                dir = dirConfig.replace("//", "\/");
                webDir = process.env.HOST;
                slash = "\/";
            }
        }

        return {dir: dir, slash: slash, webDir: webDir}
    }

    function encodeFromBase64(dataString, callback) {
        if (!dataString) {
            callback({error: 'Invalid input string'});
            return;
        }

        var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        var imageData = {};

        if (!matches || matches.length !== 3) {
            try {
                imageData.type = 'image/png';
                imageData.data = new Buffer(dataString, 'base64');
                imageData.extention = 'png';
            } catch (err) {
                callback({error: 'Invalid input string'});
                return;
            }
        } else {
            imageData.type = matches[1];
            imageData.data = new Buffer(matches[2], 'base64');

            var imageTypeRegularExpression = /\/(.*?)$/;
            var imageTypeDetected = imageData
                .type
                .match(imageTypeRegularExpression);

            if (imageTypeDetected[1] === "svg+xml") {
                imageData.extention = "svg";
            } else {
                imageData.extention = imageTypeDetected[1];
            }
        }

        callback(null, imageData);
    }

    function writer(path, imageData, callback) {
        var imageNameWithExt = imageData.name + '.' + imageData.extention;
        var imagePath = path + imageNameWithExt;

        try {
            fs.writeFile(imagePath, imageData.data, function (err, data) {
                if (callback && typeof callback === 'function') {
                    callback(err, imageNameWithExt)
                }
            });
        }
        catch (err) {
            console.log('ERROR:', err);
            if (callback && typeof callback === 'function') {
                callback(err)
            }
        }
    }

    function getImagePath(imageName, folderName) {
        var folder = folderName || defaultImageDir;
        return process.env.HOST + '/' + defaultUploadsDir + "\/" + process.env.NODE_ENV.toLowerCase() + "\/" + folder + "\/" + imageName;
    }

    function uploadImage(imageData, imageName, folderName, callback) {
        var slash = osPathData.slash;
        //var webDir = osPathData.webDir + defaultUploadsDir + slash + folderName + slash + imageName;
        //var dir = osPathData.dir + defaultUploadsDir + slash;
        var dir = osPathData.dir + slash;
        var webDir = osPathData.webDir + slash + folderName + slash + imageName;
        encodeFromBase64(imageData, function (err, data) {
            if (err) {
                if (callback && typeof callback === 'function') {
                    return callback(err);
                } else {
                    return err;
                }
            }
            data.name = imageName;
            saveImage(data, dir, folderName, slash, callback);
        });
    }

    function saveImage(data, dir, folderName, slash, callback){
        var path;
        fs.readdir(dir, function (err) {
            if (err) {
                fs.mkdir(dir, function (err) {
                    if (!err) {
                        dir += folderName + slash;
                        fs.mkdir(dir, function (err) {
                            if (!err) {
                                path = dir;
                                writer(path, data, callback);
                            } else {
                                if (callback && typeof callback === 'function') {
                                    callback(err)
                                }
                            }
                        });
                    } else {
                        if (callback && typeof callback === 'function') {
                            callback(err)
                        }
                    }
                });
            } else {
                dir += folderName + slash;
                path = dir;
                fs.readdir(dir, function (err) {
                    if (!err) {
                        writer(path, data, callback);
                    } else {
                        fs.mkdir(dir, function (err) {
                            if (!err) {
                                writer(path, data, callback);
                            } else {
                                if (callback && typeof callback === 'function') {
                                    callback(err)
                                }
                            }
                        });
                    }
                });
            }
        });
    }

    function duplicateImage(path, imageName, folderName, callback) {
        var slash = osPathData.slash;
        var dir = osPathData.dir + defaultUploadsDir + slash;
        var imageData ={};

        path = osPathData.dir + path;

        imageData.extention = path.substring(path.lastIndexOf('.') + 1);
        imageData.name = imageName;

        fs.readFile(path, function (err, data) {
            if (err) {
                if (callback && typeof callback === 'function') {
                    callback(err)
                }
            } else {
                imageData.data = data;
                saveImage(imageData, dir, folderName, slash, callback);
            }
        });
    }

    function removeImage(imageName, folderName, callback) {
        var imageDir = defaultImageDir;
        if (folderName) {
            if (typeof folderName === 'function') {
                callback = folderName;
            } else {
                imageDir = folderName;
            }
        }
        //var imagePath = rootDir + osPathData.slash + defaultUploadsDir + osPathData.slash + imageDir + osPathData.slash + imageName;
        var imagePath = rootDir + osPathData.slash + imageDir + osPathData.slash + imageName;
        fs.unlink(imagePath, function (err) {
            if (callback && typeof callback === 'function') {
                callback(err);
            }
        });
    }

    return {
        uploadImage: uploadImage,
        duplicateImage: duplicateImage,
        removeImage: removeImage,
        getImageUrl: getImagePath
    };
};

module.exports = imagesUploader;
