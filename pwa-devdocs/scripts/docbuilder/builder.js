const path = require('path');
/**
 * A step in the build process. Attached to the build session. Can build all
 * files with `runAll` or just one file with `onChange`. Specifies its input
 * paths to help with file watchers.
 *
 * @property {string} name - dash cased slug
 * @property {string} label - human readable label
 * @property {Console} logger - console object
 * @property {(string[]|null)} inputPaths - array of paths or globs to the files this builder reads
 * @property {BuildSession} session - The BuildSession attached
 */
class Builder {
    static get label() {
        return this.name;
    }

    get label() {
        return this.constructor.label;
    }

    constructor(session, name) {
        this.session = session;
        this.name = name;
        this.logger = session.getLogger(name);
    }
    /**
     * Kill any internal handles before shutdown.
     */
    async destroy() {}

    /**
     * Set up any async tasks before builds can begin.
     */
    async init() {}

    /**
     * Show a notification in the browser that a file has changed and the
     * builder is processing that change.
     *
     * @param {string} file - Changed file.
     */
    notifyChanged(file) {
        this.session.notify(
            { symbol: '⏳' },
            `<strong style="font-size: 1.2rem; opacity: 0.8">[${
                this.name
            }]</strong><br><pre>${path.relative(
                path.dirname(path.dirname(file)),
                file
            )}</pre>`
        );
    }

    /**
     * Build one asset.
     *
     * @param {string} changed - Path to the file that was changed
     * @param {string} event - Type of change event, e.g. "change" or "delete"
     * @returns {Promise<null>} Promise that fulfills when the build succeeds and rejects if it fails.
     */
    async onChange() {}
    /**
     * Build all assets.
     *
     * @returns {Promise<null>} Promise that fulfills when the build succeeds and rejects if it fails.
     */
    async runAll() {}
}

module.exports = Builder;
