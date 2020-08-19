/**
 * This script agenerates a PWA Studio to Magento Backend
 * compatibility table in markdown.
 */

const path = require('path');
const Builder = require('../builder');

class CompatTableBuilder extends Builder {
    static get label() {
        return 'Create compatibility page from magento-compatibility.js';
    }
    init() {
        const { docsRoot, projectRoot } = this.session;
        this._compatDefsFile = 'magento-compatibility.js';
        this._compatDefsPath = path.resolve(projectRoot, this._compatDefsFile);

        const outputDirectory = path.resolve(
            docsRoot,
            'src/_includes/auto-generated'
        );
        const outputFilename = 'magento-compatibility.md';
        this._outputFile = path.resolve(outputDirectory, outputFilename);
        this.inputPaths = [this._compatDefsPath];
    }
    async onChange() {
        // It's only one file.
        await this.runAll();
    }
    async runAll() {
        this.logger.info('%s => %s', this._compatDefsFile, this._outputFile);
        delete require.cache[this._compatDefsPath];
        const compatibilityDefinitions = require(this._compatDefsPath);
        /*
         *  Create a table row for every entry in the definition JSON.
         */
        const tableRows = Object.keys(compatibilityDefinitions).reduce(
            (rows, pwaVersion) => {
                const magentoVersion = compatibilityDefinitions[pwaVersion];

                const thisRow = `| ${pwaVersion} | ${magentoVersion} |\n`;
                rows += thisRow;

                return rows;
            },
            ''
        );

        /*
         *  Create the contents of the markdown file.
         */
        const markdownContents = `
| PWA Studio version | Magento core version|
| :---: | :---: |
${tableRows}
`;

        await this.session.saveOutput(this._outputFile, markdownContents);
    }
}

module.exports = CompatTableBuilder;
