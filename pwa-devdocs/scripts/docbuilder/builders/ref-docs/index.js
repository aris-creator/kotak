/**
 * Create reference content from docblocks in source code.
 * Content is placed inside the _includes folder to be used in actual topic files.
 **/

const path = require('path');
const Builder = require('../../builder');

class RefDocsBuilder extends Builder {
    static get label() {
        return 'Create reference content from docblocks in source code.';
    }
    async init() {
        const { docsRoot, projectRoot } = this.session;
        const inputPaths = [
            // This enables a rebuild if any of the template generators are changed
            path.join(path.relative(docsRoot, __dirname), '**/*.js')
        ];
        const fileSpecs = [];
        const filesByPath = new Map();

        const config = (this._config = require('./config'));
        for (const file of config.files) {
            const { target } = file;

            const sourcePath = path.join(
                projectRoot,
                config.packagesPath,
                target
            );

            const githubSource =
                'https://' +
                path.join(config.baseGitHubPath, config.packagesPath, target);

            const docsPath = path.join(
                docsRoot,
                config.includesPath,
                path.join(path.dirname(target), path.basename(target, '.js')) +
                    '.md'
            );

            const fileSpec = {
                ...file,
                sourcePath,
                githubSource,
                docsPath
            };

            inputPaths.push(sourcePath);
            fileSpecs.push(fileSpec);
            filesByPath.set(sourcePath, fileSpec);
        }
        this.inputPaths = inputPaths;
        this._fileSpecs = fileSpecs;
        this._filesByPath = filesByPath;
    }

    async onChange(changed) {
        const filePath = path.resolve(this.session.docsRoot, changed);
        const file = this._filesByPath.get(filePath);
        if (file) {
            await this._processEntry(file);
        }
        // site will reload by itself because new markdown was generated
    }

    async runAll() {
        // Run every file in config through this._processEntry
        await Promise.all(
            [...this._filesByPath.values()].map(this._processEntry.bind(this))
        );
    }

    async _processEntry(file) {
        let fileContent;
        this.logger.status('Generating ' + file.target);
        // Run require() here so that if you change the
        // scripts themselves during a watch session, the script can reload.
        switch (file.type) {
            case 'class': {
                const createClassDocs = require('./createClassDocs');
                fileContent = await createClassDocs(file);
                break;
            }
            case 'function': {
                const createFunctionDocs = require('./createFunctionDocs');
                fileContent = await createFunctionDocs(file);
                break;
            }
            default: {
                throw new Error(
                    `Unknown reference document type "${file.type} in configuration for ${file.target}`
                );
            }
        }

        if (fileContent) {
            await this.session.saveOutput(file.docsPath, fileContent);
        } else {
            this.logger.error(
                'Skipping empty file content for %s',
                file.target
            );
        }
    }
}

module.exports = RefDocsBuilder;
