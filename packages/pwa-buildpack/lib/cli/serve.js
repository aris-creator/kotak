const { resolve } = require('path');
const prettyLogger = require('../util/pretty-logger');
const serve = require('../Utilities/serve');

module.exports.command = 'serve <directory>';
module.exports.describe = 'starts a node server in staging mode';

module.exports.builder = yargs =>
    yargs
        .version()
        .showHelpOnFail(false)
        .positional('directory', {
            describe:
                'Name or path to a directory whose built PWA will be served. This directory will be the project root.',
            normalize: true
        })
        .options({
            webroot: {
                describe:
                    'Relative path from <directory> to the directory of the built project assets.',
                default: 'dist'
            }
        })
        .help();

module.exports.handler = async function buildpackCli({ directory, webroot }) {
    if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'test';
    }

    const projectRoot = resolve(directory);
    serve(projectRoot, { webroot }).catch(e => {
        prettyLogger.error(e.stack);
        throw new Error(e.message);
    });
};
