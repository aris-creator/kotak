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
    get allModules() {
        return this._all;
    }
    /** @hideconstructor */
    constructor(hookFolder, target) {
        super();
        this._hookDir = hookFolder;
        this._all = [];
        this._target = target;
        this.attach(this.constructor.name, target);
    }
    _getNamespace(segments) {
        let current = this;
        for (const segment of segments) {
            current = current[segment] || (current[segment] = {});
        }
        return current;
    }
    async populate() {
        this.track('prepopulate', { status: `reading ${this._hookDir}` });
        const hookPaths = await glob('**/use*.{mjs,js,mts,ts}', {
            cwd: this._hookDir,
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
                        path.resolve(this._hookDir, hookPath)
                    )
                ),
                this,
                { exportName: hookName }
            );
            namespace[hookName] = targetedHook;
            this._all.push(targetedHook);
        }
    }
    async runAll() {
        if (this._all.length === 0) {
            await this.populate();
        }
        await this._target.promise(this);
    }
}

module.exports = HookInterceptorSet;
