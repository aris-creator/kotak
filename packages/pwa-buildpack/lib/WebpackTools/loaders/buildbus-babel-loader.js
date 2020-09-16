const { inspect } = require('util');
const babelLoader = require('babel-loader');

function buildBusBabelLoader(content) {
    const logMeta = data => {
        let description = data;
        let meta;
        if (Array.isArray(data)) {
            [description, meta] = data;
        }
        const message = meta ? `${description}: ${inspect(meta)}` : description;
        this.emitWarning(new Error(message));
    };
    return babelLoader
        .custom(() => {
            return {
                result(res) {
                    if (res.metadata.warnings) {
                        res.metadata.warnings.forEach(logMeta);
                    }
                    return res;
                }
            };
        })
        .call(this, content);
}

module.exports = buildBusBabelLoader;
