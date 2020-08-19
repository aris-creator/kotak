const { execSync } = require('child_process');
const glob = require('glob');
const path = require('path');

/**
 * Workaround for Jekyll incremental mode's failure to rebuild when
 * configuration YAML files change.
 *
 * Goes through all the HTML templates and looks for calls to `site.data`,
 * which refers to a YAML file in the `_data` directory.
 *
 * When it finds one, it records a dependency between that YAML file and the
 * template that references it.
 *
 * The builder can then use that mapping to force Jekyll to recompile when a
 * YAML file changes, by "touching" the corresponding template file.
 *
 * @param {string} projectDir - Docs root dir.
 * @returns {object} The data dependency Map.
 */
function findDataDeps(projectDir) {
    const inputFiles = glob.sync('src/_data/**/*.{yml,yaml,json,csv}', {
        cwd: projectDir
    });

    // Maps a data property in the template to the corresponding file, e.g.
    // site.data.example => '_data/example.yml'
    const dataFilesByName = new Map();
    for (const file of inputFiles) {
        dataFilesByName.set(path.basename(file, path.extname(file)), file);
    }

    // Get a list of lines that mention 'site.data' in all HTML templates.
    let dataRefsFound;
    try {
        // Use grep for speed here. Breaks if the system doesn't have GNU or BSD
        // grep. Fortunately, practically every system does.
        dataRefsFound = execSync(
            "grep -FEr 'site\\.data\\.\\S+' src --include='*.html'",
            {
                cwd: projectDir,
                encoding: 'utf8'
            }
        ).split('\n');
    } catch (e) {
        console.error(require('util').inspect(e));
        process.exit(1);
    }

    // Maps a data file to a set of templates which reference it. The builder
    // will treat those templates as "dependencies", so when the data file
    // changes (and Jekyll obliviously ignores it) the builder will touch, but
    // not modify, the dependent templates on disk, firing a change event and
    // forcing Jekyll to do an incremental rebuild.
    const dataDeps = new Map();

    for (const line of dataRefsFound) {
        // Parse grep's human-readable output.
        const [dependent, ref] = line.trim().split(':');
        if (!(dependent && ref)) {
            // Can't parse.
            continue;
        }
        // Get "example" from "site.data.example".
        const dataProp = ref.match(/\bsite\.data\.(\S+)\b/)[1];
        const dependencyFile = dataFilesByName.get(dataProp);
        if (!dependencyFile) {
            throw new Error(
                `File ${dependent} references ${dataProp} in\n\n${ref}\n\nbut a corresponding file was not found in src/_data: ${[
                    ...dataFilesByName.keys()
                ]}`
            );
        }
        let refs = dataDeps.get(dependencyFile);
        if (!refs) {
            refs = new Set();
            dataDeps.set(dependencyFile, refs);
        }
        refs.add(dependent);
    }

    return dataDeps;
}
module.exports = findDataDeps;
