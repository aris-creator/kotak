const path = require('path');
const HookInterceptorSet = require('./HookInterceptorSet');

const packageDir = path.resolve(__dirname, '../../');

module.exports = targets => {
    const builtins = targets.of('@magento/pwa-buildpack');

    builtins.specialFeatures.tap(featuresByModule => {
        featuresByModule['@magento/peregrine'] = {
            cssModules: true,
            esModules: true,
            graphQlQueries: true
        };
    });

    /**
     * Tap the low-level Buildpack target for wrapping _any_ frontend module.
     * Wrap the config object in a HookInterceptorSet, which presents
     * higher-level targets for named and namespaced hooks, instead of the file
     * paths directly. Pass that higher-level config through `talons` and
     * `hooks` interceptors, so they can add wrappers for the hook modules
     * without tapping the `transformModules` config themselves.
     */
    const publicHookSets = ['hooks', 'talons'];
    builtins.transformModules.tapPromise(async addTransform => {
        await Promise.all(
            publicHookSets.map(async name => {
                const hookInterceptors = new HookInterceptorSet(
                    path.resolve(packageDir, 'lib', name),
                    targets
                );
                await hookInterceptors.populate();

                await targets.own[name].promise(hookInterceptors);
                hookInterceptors.flush().forEach(addTransform);
            })
        );
    });
};
