const path = require('path');
const sass = require('sass');
const Builder = require('../builder');

class StylesheetBuilder extends Builder {
    static get label() {
        return 'Compile stylesheets with SASS';
    }
    init() {
        const { session } = this;
        this._mainCss = '/builds/css/main.css';
        this._outFile = path.resolve(session.docsRoot, `_site${this._mainCss}`);
        this._inFile = 'src/_scss/main.scss';
        this.inputPaths = [
            path.resolve(session.docsRoot, './src/_scss/**/*.scss')
        ];
    }

    async onChange(file, event) {
        this.logger.info('SASS: "%s" %s. Rebuilding...', file, event);
        const { css } = sass.renderSync({
            file: this._inFile,
            outFile: this._outFile,
            sourceMap: true,
            sourceMapEmbed: true
        });
        await this.session.saveOutput(this._outFile, css);
        this.session.site.reload(this._mainCss);
    }

    async runAll() {
        this.logger.info('SASS %s => %s', this._inFile, this._outFile);
        const { css } = sass.renderSync({
            file: this._inFile,
            outFile: this._outFile,
            sourceMap: false,
            sourceMapEmbed: false,
            outputStyle: this.session.production ? 'compressed' : undefined
        });
        await this.session.saveOutput(this._outFile, css);
    }
}

module.exports = StylesheetBuilder;
