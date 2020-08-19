const path = require('path');
const webpack = require('webpack');
const Builder = require('../builder');

class JavaScriptBuilder extends Builder {
    static get label() {
        return 'Build site JavaScript with Webpack';
    }
    destroy() {
        return new Promise((res) => {
            if (this._watching) {
                this.logger.info('Closing watch');
                this._watching.close(res);
            }
        });
    }
    init() {
        const { docsRoot, production, watch } = this.session;
        const config = require(path.join(docsRoot, 'webpack.config.js'));
        config.mode = production ? 'production' : 'development';

        this._compiler = webpack(config);

        // Flag to ignore the first run and notification.
        let firstRun = true;
        if (watch) {
            // Set up persistent watch task to do incremental compile. Runs
            // separate from the browsersync and jekyll builds, so this builder
            // doesn't need an onChange method because it handles change events
            // itself.
            this._watching = this._compiler.watch(
                {
                    verbosity: 'none'
                },
                (err, stats) => {
                    if (err) {
                        this.logger.error(err);
                        this.session.notify(
                            { symbol: '❌', emphasis: true },
                            'Webpack failed! See console.'
                        );
                    } else if (!firstRun) {
                        this.logger.info(
                            'Webpack hot update took %s seconds',
                            this._timeCompile(stats)
                        );
                        // TODO: Find a way to invalidate and re-inject JS :)
                        this.session.site.reload();
                    }
                    firstRun = false;
                }
            );

            // Notify on file change. Better than using onChange since Webpack
            // is already watching.
            this._compiler.hooks.invalid.tap(
                this.constructor.name,
                (fileName) => {
                    this.notifyChanged(fileName);
                }
            );
        }
    }
    async runAll() {
        return new Promise((res, rej) => {
            this._compiler.run((err, stats) => {
                if (err) {
                    rej(err);
                } else {
                    const seconds = this._timeCompile(stats);
                    this.logger.info(
                        'wrote %s file(s) in %s seconds',
                        Object.keys(stats.compilation.assets).length,
                        seconds
                    );
                    res();
                }
            });
        });
    }
    _timeCompile(stats) {
        return ((stats.endTime - stats.startTime) / 1000).toFixed(2);
    }
}

module.exports = JavaScriptBuilder;
