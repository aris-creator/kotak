const { name } = require('./package.json');
function includeComponentsWithBuildpack(workDir, config) {
    const { resolve = {} } = config;
    resolve.alias = resolve.alias || {};
    resolve.alias[name];
}
