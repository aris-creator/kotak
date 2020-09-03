const SingleImportStatement = require('./SingleImportStatement');
const TargetableModule = require('./TargetableModule');

class TargetableESModuleArray extends TargetableModule {
    constructor(...args) {
        super(...args);
        this._items = [];
        this._warnings = [];
        this._bindings = new Set();
        this._importsBySource = new Map();
        this.uniqueIDs = 0;
    }
    add(...items) {
        return this.append(...items);
    }
    append(...items) {
        return this.push(...items);
    }
    prepend(...items) {
        return this.unshift(...items);
    }
    push(...items) {
        return this._insertBy(items, item => this._items.push(item));
    }
    unshift(...items) {
        return this._insertBy(items, item => this._items.unshift(item));
    }
    _generate(importString) {
        let importStatement = new SingleImportStatement(importString);
        if (
            this._importsBySource.get(importStatement.source) ===
            importStatement.imported
        ) {
            // that's already here, then.
            return false;
        }
        if (this._bindings.has(importStatement.binding)) {
            // we have a binding collision. try importing the binding under a
            // different name.
            importStatement = importStatement.changeBinding(
                importStatement.binding + ++this.uniqueIDs
            );
        }
        const { binding, source, imported, statement } = importStatement;
        this._bindings.add(binding);
        this._importsBySource.set(source, imported);
        return [statement, binding];
    }
    _insertBy(items, callback) {
        for (const item of items) {
            const generated = this._generate(item);
            if (generated) {
                callback(generated);
            }
        }
        this._updateTransform();
    }
    _updateTransform() {
        if (this._items.length > 0 && this._queuedTransforms.length === 0) {
            this.addTransform(
                'source',
                '@magento/pwa-buildpack/lib/WebpackTools/loaders/export-esm-collection-loader',
                {
                    items: this._items,
                    warnings: this._warnings
                }
            );
        }
    }
}

module.exports = TargetableESModuleArray;
