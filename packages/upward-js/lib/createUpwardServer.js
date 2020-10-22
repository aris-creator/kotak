/**
 * Standalone server script which creates an Express server, configures and
 * binds it according to configuration, and applies the upward-js middleware.
 */

const { join, resolve } = require('path');
const express = require('express');
const middleware = require('./middleware');
const errorhandler = require('errorhandler');
const { version } = require('../package.json');
const morgan = require('morgan');

/**
 * Create an upward-js standalone server and optionally bind it to a local
 * address. Configure logging and debugging middleware depending on standard
 * detection of environment: `process.env.NODE_ENV` === 'production'.
 *
 * ### `createUpwardServer` Configuration Options
 *
 * | Property | Type | Default | Description
 * | -------- | ---- | ------- | -----------
 * |`upwardPath` | `string` |  | Path, relative to the current directory, of a YML file with an UPWARD configuration. **Required**.
 * |`bindLocal` | `boolean` | `false` | Create and  bind an HTTP server before returning.
 * |`port` | `number` | `0` | Specify the port to be bound. `0` means the first open port.
 * |`host` | `string` | `0.0.0.0` | Specify the host on which to listen. `0.0.0.0` means all local IPv4 requests.
 * |`https` | `object` |  | To bind an HTTPS server instead of HTTP, pass a valid `{ key, cert }` object here.
 * |`logUrl` | `boolean` | `false` | Log the bound URL to stdout (mostly used for testing against upward-spec)
 * |`publicPath` | `string` | `"/"` | Mount point for the UPWARD app. Used if `bindLocal` is true.
 *
 * Returns a plain object with the following properties:
 * an `app` property. This is an Express
 *
 *
 * @param {object} config Configuration object.
 * @return Promise `{ app, server?, close? }`
 */
async function createUpwardServer({
    bindLocal = false,
    port = 0,
    host = '0.0.0.0',
    https,
    logUrl = false,
    publicPath = '/',
    upwardPath,
    env = process.env,
    before = () => {}
}) {
    if (!upwardPath) {
        throw new Error(`upwardPath is required`);
    }
    const app = express();
    before(app);
    const upward = await middleware({
        upwardPath: resolve(upwardPath),
        env,
        publicPath
    });
    if (env.NODE_ENV === 'production') {
        app.use(morgan('combined'));
        app.use(upward);
    } else {
        app.use(morgan('dev'));
        app.use(upward);
        errorhandler.title = `⚠️ Error in upward-js v${version}`;
        app.use(errorhandler());
    }
    if (bindLocal) {
        return new Promise((resolve, reject) => {
            try {
                let rootApp = app;
                if (publicPath && publicPath !== '/') {
                    rootApp = express();
                    rootApp.use(publicPath, app);
                    rootApp.use((req, res) =>
                        res.redirect(join(publicPath, req.url))
                    );
                }
                const protocol = https ? 'https' : 'http';
                const server = https
                    ? require('https').createServer(https, rootApp)
                    : require('http').createServer(rootApp);

                server.listen(port, host);

                server.on('listening', () => {
                    if (logUrl) {
                        const url = new URL(
                            `${protocol}://${host}:${server.address().port}/`
                        );
                        url.pathname = publicPath;
                        console.log(url.href);
                    }
                    resolve({
                        app,
                        server,
                        close() {
                            return new Promise(resolve => {
                                server.on('close', resolve);
                                server.close();
                            });
                        }
                    });
                });
            } catch (e) {
                reject(e);
            }
        });
    }
    return { app };
}

module.exports = createUpwardServer;
