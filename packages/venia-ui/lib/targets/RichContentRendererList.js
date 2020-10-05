const { Targetables } = require('@magento/pwa-buildpack');

const renderersListPath =
    '@magento/venia-ui/lib/components/RichContent/richContentRenderers.js';
/**
 * Implementation of our 'richContentRenderers' target. This will gather
 * RichContentRenderer declarations { importPath, componentName } from all
 * interceptors, and then tap `builtins.transformModules` to inject a module
 * transform into the build which is configured to generate an array of modules
 * to be imported and then exported.
 *
 * An instance of this class is made available when you use VeniaUI's
 * `richContentRenderers` target.
 */
class RichContentRendererList {
    static connect(targets) {
        const rendererList = new RichContentRendererList(targets);
        rendererList._connect();
        return rendererList;
    }
    /** @hideconstructor */
    constructor(targets) {
        this._builtinTargets = targets.of('@magento/pwa-buildpack');
        this._declaredTarget = targets.own.richContentRenderers;
        this._renderers = Targetables.using(targets).esModuleArray(
            renderersListPath
        );
    }
    /**
     * Add a rendering strategy to the RichContent component.
     *
     * @param {Object} strategy - Describes the rich content renderer to include
     * @param {string} strategy.importPath - Import path to the RichContentRenderer module. Should be package-absolute.
     * @param {string} strategy.componentName - Name that will be given to the imported renderer in generated code. This is used for debugging purposes.
     */
    add(renderer) {
        if (
            typeof renderer.componentName !== 'string' ||
            !renderer.componentName ||
            typeof renderer.importPath !== 'string' ||
            !renderer.importPath
        ) {
            throw new Error(
                `richContentRenderers target: Argument is not a valid rich content renderer strategy. A valid strategy must have a JSX element name as "componentName" and a resolvable path to the renderer module as "importPath".`
            );
        }
        this._renderers.unshift(
            `import * as ${renderer.componentName} from '${
                renderer.importPath
            }';`
        );
    }
    _connect() {
        this._builtinTargets.transformModules.tapPromise(async addTransform => {
            await this._declaredTarget.promise(this);
            this._renderers.flush().forEach(addTransform);
            this._destroy();
        });
    }
    _destroy() {
        this.add = () => {
            throw new Error(
                'Cannot add renderer: builtins.transformModules has already been called and its interceptors have already run.'
            );
        };
    }
}

module.exports = RichContentRendererList;
