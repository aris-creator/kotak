const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { builders, all } = require('./builders');
const loggers = require('webpack/lib/logging/runtime');

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

/**
 * Properties of the build session.
 *
 * @mixin
 */
const BuildSessionProps = {
    /**
     * Path of the **docs** project
     * @type string
     */
    docsRoot: path.resolve(__dirname, '../../'),
    /**
     * Path of the **PWA Studio monorepo** project
     * @type string
     */
    projectRoot: path.resolve(__dirname, '../../../'),
    /**
     * Options collection for BrowserSync. Only used in watch mode.
     * @type object
     * @see browsersync.io
     */
    bsOptions: {
        port: process.env.DEVDOCS_DEVELOP_PORT || process.env.PORT || 3000,
        ghostMode: true,
        open: false,
        reloadDebounce: 200,
        files: []
    },
    /**
     * @param {string} label Label of the logger.
     * @returns {Console} A Logger object.
     */
    getLogger(label) {
        return loggers.getLogger(label);
    },
    /**
     * Whether we are in production mode.
     * @type boolean
     */
    production: false,
    /**
     * Whether we are in watch mode.
     * @type boolean
     */
    watch: false
};

/**
 * @mixes BuildSessionProps
 */
class BuildSession {
    /**
     * Creates an instance of BuildSession.
     * @param {BuildSessionProps} opts
     */
    constructor(opts) {
        Object.assign(this, BuildSessionProps, opts);
        this.logger = this.getLogger('docbuild');
        if (this.watch) {
            const browserSync = require('browser-sync');
            this.site = browserSync.create('site');
        }
        this._builders = {};
    }
    /**
     * Get or create a builder by its name, e.g. `site` or `env-var-defs`.
     *
     * @param {string} name - Name of the builder to get or create.
     * @returns {Builder}
     */
    async getBuilder(name) {
        if (!builders.hasOwnProperty(name)) {
            throw new Error(
                `Builder "${name}" not found. Valid builder names are: "${all.join()}"`
            );
        }
        const myBuilders = this._builders;
        if (!myBuilders[name]) {
            try {
                const BuilderClass = require(builders[name]);
                const builder = new BuilderClass(this, name);
                await builder.init();
                myBuilders[name] = builder;
            } catch (e) {
                throw new Error(`could not get builder "${name}": ${e.stack}`);
            }
        }
        return myBuilders[name];
    }

    /**
     * Notify the browser.
     *
     * @param {object} opts - Message options
     * @param {string} opts.symbol - Symbol (an emoji probably) for notification
     * @param {boolean} opts.emphasis - True to notify _emphatically_
     * @param {string} msg - What to actually notify
     */
    notify({ symbol, emphasis }, msg) {
        const opts = emphasis
            ? {
                  wrapper: 'strong',
                  size: 1.4,
                  ttl: 4000
              }
            : {
                  wrapper: 'span',
                  size: 1,
                  ttl: 2000
              };
        this.site.notify(
            `<${opts.wrapper} style="font-size: ${opts.size}rem"><span style="display: inline-block; font-size: 1.4rem; padding-right: 1rem">${symbol}</span>${msg}</${opts.wrapper}>`,
            opts.ttl
        );
    }

    /**
     * Save a file to the chosen output directory. Makes all directories where
     * appropriate.
     *
     * @async
     * @param {string} dest - Path to save to
     * @param {string} contents - Contents of file
     * @returns {Promise}
     */
    async saveOutput(dest, contents) {
        await mkdir(path.dirname(dest), { recursive: true });
        await writeFile(dest, contents, 'utf8');
    }
}

module.exports = BuildSession;
