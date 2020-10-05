const { Targetables } = require('@magento/pwa-buildpack');

const routesPath = '@magento/venia-ui/lib/components/Routes/routes.js';

/**
 * Implementation of our `routes` target. When Buildpack runs
 * `transformModules`, this interceptor will provide a nice API to
 * consumers of `routes`: instead of specifying the transform file
 * and the path to the routes component, you can just push route
 * requests into a neat little array.
 */
class RouteList {
    static connect(targets) {
        const routeList = new RouteList(targets);
        routeList._connect();
        return routeList;
    }
    /** @hideconstructor */
    constructor(targets) {
        this._builtinTargets = targets.of('@magento/pwa-buildpack');
        this._declaredTarget = targets.own.routes;
        this._routesComponent = Targetables.using(targets).reactComponent(
            routesPath
        );
    }
    add(routes) {
        for (const route of routes) {
            const AddedRoute = this._routesComponent.addLazyReactComponentImport(
                route.path,
                route.name
            );
            this._routesComponent.prependJSX(
                'Switch',
                `<Route ${route.exact ? 'exact ' : ''}path="${
                    route.pattern
                }"><${AddedRoute}/></Route>`
            );
        }
    }
    _connect() {
        this._builtinTargets.transformModules.tapPromise(async addTransform => {
            const routes = await this._declaredTarget.promise([]);
            this.add(routes);
            this._routesComponent.flush().forEach(addTransform);
        });
    }
}

module.exports = RouteList;
