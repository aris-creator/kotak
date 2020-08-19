const { exec: cpExec, spawn } = require('child_process');
const { promisify } = require('util');
const StreamSnitch = require('stream-snitch');

const exec = promisify(cpExec);

const bindDataDependencies = require('./bind-data-dependencies');
const Builder = require('../../builder');

class JekyllBuilder extends Builder {
    static get label() {
        return 'Build doc site with Jekyll';
    }
    constructor(...args) {
        super(...args);
        this.port = process.env.JEKYLL_WATCH_PORT || 4001;
        this.host = process.env.JEKYLL_WATCH_HOST || '0.0.0.0';
    }
    async destroy() {
        if (this._server) {
            this.logger.log('Closing Jekyll server');
            this._server.kill();
        }
    }
    async init() {
        if (this.session.watch) {
            this._dataDeps = bindDataDependencies(this.session.docsRoot);
            await this._setupServer();
            await this._setupWatch();
        }
    }
    async runAll() {
        return new Promise((res, rej) => {
            const configs = this.session.production
                ? 'src/_config.yml'
                : 'src/_config.yml,_config-production.yml';
            const jekyllBuild = spawn(
                'bundle',
                [
                    'exec',
                    'jekyll',
                    'build',
                    '--source',
                    'src',
                    '--config',
                    configs
                ],
                {
                    cwd: this.session.docsRoot,
                    stdio: 'inherit'
                }
            );
            jekyllBuild
                .on('error', this._verifyBundleCmd(rej))
                .on('close', (code) =>
                    code === 0
                        ? res()
                        : rej(new Error(`jekyll exited with code ${code}`))
                );
        });
    }
    /**
     * Run Jekyll's incremental build server as a child process.
     * In watch mode, the site is served by "jekyll serve". That gives us
     * incremental rebuilding of templates and markdown for free. The
     * BrowserSync site proxies back to the Jekyll site, adding only its little
     * BrowserSync script in the HTML responses and the websocket refresher.
     * @private
     */
    async _setupServer() {
        this._server = await new Promise((res, rej) => {
            const server = spawn(
                'bundle',
                [
                    'exec',
                    'jekyll',
                    'serve',
                    '--host',
                    this.host,
                    '--port',
                    this.port,
                    '--source',
                    'src',
                    '--config',
                    'src/_config.yml',
                    '--incremental'
                ],
                { cwd: this.session.docsRoot }
            );

            server.on('error', this._verifyBundleCmd(rej));

            server.stdout.pipe(process.stdout);
            server.stderr.pipe(process.stderr);

            // Watch the output to see when the server says it's running.
            const whenRunning = new StreamSnitch(
                /server running.*\n/gim,
                () => {
                    // Only then do we resolve the promise returned by
                    // #_setupServer.
                    res(server);
                }
            );
            server.stdout.pipe(whenRunning);
        });
    }
    _setupWatch() {
        const { session } = this;

        // Watch the output to see which file changes Jekyll detected.
        const whenDone = new StreamSnitch(
            // Matches any number of output lines containing only markdown or html files.
            /\n\s*\S+?\.(?:html|md|)\s*?(?:\n\s*\S+\/\S+\.\w+\s*?\n\s+)*\.\.\.done/gi,
            (match) => {
                // // Format the file list and pass along to browsersync. TODO:
                // // Make this useful by detecting whether the current page in the
                // // browser needs to reload.
                // const files = match[0]
                //     .trim()
                //     .split('\n')
                //     .slice(0, -1)
                //     .map((file) => file.trim());
                session.site.reload(/* files */);
            }
        );
        this._server.stdout.pipe(whenDone);

        // Tell the session to configure BrowserSync to proxy back.
        session.bsOptions.proxy = `http://${this.host}:${this.port}`;
        // Watch all changes to data files, so we can use the bound dependency
        // map to force incremental builds.
        session.bsOptions.files.push({
            match: 'src/_data/**/*',
            fn: async (_, changed) => {
                try {
                    this.notifyChanged(changed);
                    const deps = this._dataDeps.get(changed);
                    if (deps) {
                        const depArgs = [...deps]
                            .map((dep) => `'${dep}'`)
                            .join(' ');
                        // Use unix "touch" to trigger a changed event without
                        // changing the file.
                        await exec(`touch ${depArgs}`, {
                            cwd: session.docsRoot
                        });
                    }
                } catch (e) {
                    this.logger.error('force incremental build failed', e);
                    session.notify(
                        { symbol: '⚠️', emphasis: true },
                        `Build failed! See console.`
                    );
                }
            }
        });
    }
    _verifyBundleCmd(passError) {
        return (error) =>
            passError(
                error.code === 'ENOENT'
                    ? new Error(
                          'The "bundle" command was not found. Make sure that Ruby ^2.7 is installed, and then run "gem install bundle".'
                      )
                    : error
            );
    }
}

module.exports = JekyllBuilder;
