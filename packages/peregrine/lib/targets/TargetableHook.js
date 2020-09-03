const { TargetableESModule } = require('@magento/pwa-buildpack');

class TargetableHook {
    constructor(talonPath, talonConfig, { exportName }) {
        this._exportName = exportName;
        this._talonModule = new TargetableESModule(talonPath, talonConfig);
    }

    /** @protected */
    flush() {
        return this._talonModule.flush();
    }

    /**
     * Decorate this talon using a [wrapper module](#wrapper_modules)
     * OR an inline function which will be turned into a wrapper module.
     *
     * @param {string} wrapperModuleOrFunction - Import path to the wrapper
     * module. Should be package-absolute. OR, an inline function which will be
     * serialized and injected as a virtual module.
     */
    wrapWith(wrapperModuleOrFunction) {
        return this._talonModule.wrapWithFile(
            this._exportName,
            wrapperModuleOrFunction
        );
    }
}

module.exports = TargetableHook;
