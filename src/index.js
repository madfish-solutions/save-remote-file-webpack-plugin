const crypto = require('crypto');
const download = require('download');

module.exports = class SaveRemoteFilePlugin {
    constructor(options) {
        if (options instanceof Array) {
            this.options = options;
        } else {
            this.options = [options];
        }
    }

    appendHashToPath(path, hash) {
        const newPath = path.substring(0, path.lastIndexOf('.'))
            + '.'
            + hash
            + path.substring(path.lastIndexOf('.'));

        return newPath;
    }

    apply(compiler) {
        const { webpack } = compiler;
        const { RawSource } = webpack.sources;
        const pluginName = 'SaveRemoteFilePlugin';

        compiler.hooks.thisCompilation.tap(
            pluginName,
            compilation => {
                compilation.hooks.processAssets.tapPromise(
                    { name: pluginName, stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
                    () => {
                        return new Promise((resolve, reject) => {
                            let count = this.options.length;
                            const downloadFiles = (option) => {
                                const reportProgress = compilation.reportProgress;
                                download(option.url).then(data => {
                                    const hash = crypto.createHash('md5').update(data).digest("hex");
                                    const newPath = (option.hash === false)
                                        ? option.filepath
                                        : this.appendHashToPath(option.filepath, hash);
                                    compilation.emitAsset(newPath, new RawSource(data));
                                    if (reportProgress) {
                                        reportProgress(95.0, 'Remote file downloaded: ', newPath);
                                    }
                                    // Issue the calback after all files have been processed
                                    count--;
                                    if (count === 0) {
                                        resolve();
                                    }
                                }).catch(error => {
                                    compilation.errors.push(new Error(error));
                                    reject();
                                });
                            };
                            this.options.forEach(downloadFiles);
                        });
                    }
                )
            }
        );
    }
};
