const SingleImportStatement = require('./SingleImportStatement');
const TargetableModule = require('./TargetableModule');

class TargetableESModuleObject extends TargetableModule {
    constructor(...args) {
        super(...args);
        this._mapping = {};
        this._bindings = new Map();
        this._warnings = [];
    }
    set(importString) {
        const {
            binding,
            source,
            imported,
            statement
        } = new SingleImportStatement(importString);
        const alreadyBound = this._bindings.get(binding);
        if (alreadyBound) {
            this._warnings.push(
                `TargetableESModuleObject "${
                    this.file
                }": Export "${binding}" was already assigned to "${alreadyBound}". Overwriting to "${imported}" from "${source}".`
            );
            delete this._mapping[alreadyBound];
        }
        this._bindings.set(binding, statement);
        this._mapping[statement] = binding;
        this._updateTransform();

        return this;
    }
    _updateTransform() {
        if (this._queuedTransforms.length === 0) {
            this.addTransform(
                'source',
                '@magento/pwa-buildpack/lib/WebpackTools/loaders/export-esm-collection-loader',
                {
                    items: this._mapping,
                    warnings: this._warnings
                }
            );
        }
    }
}

module.exports = TargetableESModuleObject;
