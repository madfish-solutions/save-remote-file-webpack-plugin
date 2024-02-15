'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var crypto = require('crypto');
var axios = require('axios');

module.exports = function () {
    function SaveRemoteFilePlugin(options) {
        _classCallCheck(this, SaveRemoteFilePlugin);

        if (options instanceof Array) {
            this.options = options;
        } else {
            this.options = [options];
        }
    }

    _createClass(SaveRemoteFilePlugin, [{
        key: 'appendHashToPath',
        value: function appendHashToPath(path, hash) {
            var newPath = path.substring(0, path.lastIndexOf('.')) + '.' + hash + path.substring(path.lastIndexOf('.'));

            return newPath;
        }
    }, {
        key: 'apply',
        value: function apply(compiler) {
            var _this = this;

            var webpack = compiler.webpack;
            var RawSource = webpack.sources.RawSource;

            var pluginName = 'SaveRemoteFilePlugin';

            compiler.hooks.thisCompilation.tap(pluginName, function (compilation) {
                compilation.hooks.processAssets.tapPromise({ name: pluginName, stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL }, function () {
                    return new Promise(function (resolve, reject) {
                        var count = _this.options.length;
                        var downloadFiles = function downloadFiles(option) {
                            var reportProgress = compilation.reportProgress;
                            axios.get(option.url, { responseType: 'arraybuffer' }).then(function (response) {
                                var hash = crypto.createHash('md5').update(response.data).digest("hex");
                                var newPath = option.hash === false ? option.filepath : _this.appendHashToPath(option.filepath, hash);
                                compilation.emitAsset(newPath, new RawSource(response.data));
                                if (reportProgress) {
                                    reportProgress(95.0, 'Remote file downloaded: ', newPath);
                                }
                                // Issue the calback after all files have been processed
                                count--;
                                if (count === 0) {
                                    resolve();
                                }
                            }).catch(function (error) {
                                compilation.errors.push(new Error(error));
                                reject();
                            });
                        };
                        _this.options.forEach(downloadFiles);
                    });
                });
            });
        }
    }]);

    return SaveRemoteFilePlugin;
}();
