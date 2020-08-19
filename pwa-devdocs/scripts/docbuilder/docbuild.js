const BuildSession = require('./session');
const argv = require('minimist')(process.argv.slice(2), {
    boolean: ['help', 'production']
});

const toRun = argv._.map((taskGroups) => taskGroups.split(','));

const session = new BuildSession({
    docsRoot: process.cwd(),
    production: argv.production,
    watch: false
});

const padRight = (str, len) => {
    let padded = str;
    while (padded.length < len) {
        padded += ' ';
    }
    return padded;
};

const formatTaskDoc = () => {
    const { builders, all } = require('./builders');
    const longestName = all.reduce((high, next) =>
        next.length > high.length ? next : high
    );
    return all.map((taskname) => {
        return `- ${padRight(taskname, longestName.length)}
          ${require(builders[taskname]).label}
`;
    });
};

if (argv.help || toRun.length === 0 || argv._.includes('help')) {
    console.log(`
    Usage: yarn docbuild <task-group> [--production]

    Builds one or more parts of the PWA Studio devdocs site.

        yarn docbuild ref-docs,compat-table javascripts site --production

    The above command builds "ref-docs" and "compat-table" in parallel,
    then "javascripts" in serial, and then "site" in serial.

    Define a "task group", which will run in parallel, by listing tasks
    delimited with commas (no spaces).

    Run task groups serially by separating each group with spaces.

    Tasks refer to Builder modules defined in the docbuilder/builders folder.

    Currently available tasks are:

    ${formatTaskDoc().join('\n    ')}

    Options:

      --production      Run tasks in production mode.
    `);
}

let current = 0;

async function runBuilders(taskGroups) {
    const numGroups = taskGroups.length;
    for (const taskGroup of taskGroups) {
        const preamble = `Step ${++current} of ${numGroups}:`;
        session.logger.info(
            preamble,
            taskGroup.length > 1
                ? `${taskGroup.length} tasks in parallel: ${taskGroup}`
                : taskGroup[0]
        );
        await Promise.all(
            taskGroup.map(async (task) => {
                const builder = await session.getBuilder(task);
                try {
                    await builder.runAll();
                } catch (e) {
                    const betterError = new Error(
                        `Failed to run "[${task}] ${builder.label}" builder: ${e.stack}`
                    );
                    Error.captureStackTrace(betterError, runBuilders);
                    throw betterError;
                }
            })
        );
        session.logger.clear();
    }
}

const fail = (e) => {
    session.logger.error('Failed:', e);
    session.logger.error(`Completed ${current - 1} steps of ${toRun.length}`);
    process.exit(1);
};

runBuilders(toRun).catch(fail);
