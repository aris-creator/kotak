const path = require('path');
const packageRoot = path.resolve(__dirname, '../..');
const glob = require('fast-glob');
const Trackable = require('@magento/pwa-buildpack/lib/Utilities/Trackable');
const TargetableHook = require('./TargetableHook');

/**
 * A registry of Peregrine hooks you can wrap custom code around. An instance
 * of this class is made available when you use Peregrine's `hooks` or `talons` targets.
 * @private
 */
class HookInterceptorSet extends Trackable {
    /** @hideconstructor */
    constructor(baseDir, trackingOwner = () => {}) {
        super();
        this._baseDir = baseDir;
        this._all = [];
        this.attach(this.constructor.name, trackingOwner);
    }
    _getNamespace(segments) {
        let current = this;
        for (const segment of segments) {
            current = current[segment] || (current[segment] = {});
        }
        return current;
    }
    async populate() {
        this.track('prepopulate', { status: `reading ${this._baseDir}` });
        const hookPaths = await glob('**/use*.{mjs,js,mts,ts}', {
            cwd: this._baseDir,
            ignore: ['**/__*__/**'],
            suppressErrors: true,
            onlyFiles: true
        });
        this.track('populate', { count: hookPaths.length, hookPaths });
        for (const hookPath of hookPaths) {
            const isNested = hookPath.includes(path.sep);
            const segments = isNested
                ? path.dirname(hookPath).split(path.sep)
                : [];
            const namespace = this._getNamespace(segments);
            const hookName = path.basename(hookPath, path.extname(hookPath));
            const targetedHook = new TargetableHook(
                path.join(
                    '@magento/peregrine',
                    path.relative(
                        packageRoot,
                        path.resolve(this._baseDir, hookPath)
                    )
                ),
                this,
                { exportName: hookName }
            );
            namespace[hookName] = targetedHook;
            this._all.push(targetedHook);
        }
    }
    flush() {
        const flushed = [].concat(
            ...this._all.map(targeted => targeted.flush())
        );
        this.track('flush', { count: flushed.length });
        return flushed;
    }
}

module.exports = HookInterceptorSet;
