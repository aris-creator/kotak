const types = {
    ESModule: require('./TargetableESModule'),
    ESModuleArray: require('./TargetableESModuleArray'),
    ESModuleObject: require('./TargetableESModuleObject'),
    Module: require('./TargetableModule'),
    ReactComponent: require('./TargetableReactComponent')
};
const TargetProvider = require('../../BuildBus/TargetProvider');
const moduleCache = new Map();

class TargetableFactory {
    static clearCache() {
        moduleCache.clear();
    }
    static using(targets) {
        return new TargetableFactory(targets);
    }
    constructor(targets) {
        if (!(targets instanceof TargetProvider)) {
            throw new Error(
                'Must supply a TargetProvider to a new TargetableFactory.'
            );
        }
        this._targets = targets;
    }
    module(file) {
        return this._provide(types.Module, file);
    }
    esModule(file) {
        return this._provide(types.ESModule, file);
    }
    esModuleArray(file) {
        return this._provide(types.ESModuleArray, file);
    }
    esModuleObject(file) {
        return this._provide(types.ESModuleObject, file);
    }
    reactComponent(file) {
        return this._provide(types.ReactComponent, file);
    }
    _provide(Targetable, file) {
        const extant = moduleCache.get(file);
        if (!extant) {
            const targetable = new Targetable(file, this._targets);
            moduleCache.set(file, targetable);
            return targetable;
        }
        if (extant.constructor === Targetable) {
            return extant;
        }
        throw new Error(
            `Cannot target the file "${file}" using "${
                Targetable.name
            }", because it has already been targeted by the ${
                extant.constructor.name
            } created by "${extant._targets.name}".`
        );
    }
}

Object.assign(TargetableFactory, types);

module.exports = TargetableFactory;
