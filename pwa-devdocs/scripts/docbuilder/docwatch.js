/**
 * Hot-reloading server version of the doc builder.
 * Runs all builders available, attaching each one to a session in watch mode.
 *
 * Most of the builders have special incremental-build behavior when their
 * session is in watch mode.
 */
const path = require('path');
const betterOpen = require('better-opn');
const BuildSession = require('./session');
const { all } = require('./builders');

const session = new BuildSession({ watch: true });

const running = [];
const cleanup = () => Promise.all(running.map((builder) => builder.destroy()));
const die = async () => {
    await cleanup();
    session.site.exit();
    process.exit(1);
};

async function run() {
    for (const task of all) {
        const builder = await session.getBuilder(task);
        running.push(builder);

        if (builder.onChange && builder.inputPaths) {
            session.bsOptions.files.push({
                match: builder.inputPaths,
                fn: async (event, changed) => {
                    try {
                        builder.notifyChanged(changed);

                        const absPath = path.resolve(session.docsRoot, changed);
                        // Hot reload on changes to the builder scripts themselves!
                        if (require.cache[absPath]) {
                            builder.logger.info(
                                'Builder script %s changed. Reloading...',
                                changed
                            );
                            delete require.cache[absPath];
                        }
                        if (builder.onChange) {
                            await builder.onChange(changed, event);
                        }
                    } catch (e) {
                        builder.logger.error('Failed:', e);
                        session.notify(
                            { symbol: '❌', emphasis: true },
                            `${label} failed! See console.`
                        );
                    }
                }
            });
        }
    }

    const { site } = session;

    site.init(session.bsOptions, (err, bsInstance) => {
        if (err) {
            session.logger.error(err);
            die();
        }

        // Keep track of the currently open page, which builders could use
        // to decide whether to re-run.
        site.currentLocation = bsInstance.getOption('urls').get('local');

        // Instead of using browsersync's built-in `open` option, which always
        // opens a new browser window, use `better-opn` to try and reuse a tab.
        const openNewTab = setTimeout(() => {
            betterOpen(site.currentLocation);
        }, 2000);

        // Monitor attached browser tabs as they reconnect.
        site.sockets.on('connection', (socket) => {
            const numConnected = Object.keys(socket.server.sockets.connected);
            // are there multiple connected tabs open?
            // Then don't try to focus one, because which one would it be?
            if (numConnected > 1) {
                session.logger.log(
                    'Multiple browsers are open; cancelling autofocus / autolaunch of new tab'
                );
                clearTimeout(openNewTab);
            }

            // Grab the location of the first connected tab.
            // When the callback runs, we'll re-focus that tab. Glorious!
            socket.on('ui:history:connected', ({ href }) => {
                site.currentLocation = href;
            });
        });
    });
}

run().catch((e) => {
    console.error(e.stack);
    die();
});
