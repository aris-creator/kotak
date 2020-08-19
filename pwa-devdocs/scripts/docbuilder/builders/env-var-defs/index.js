const path = require('path');
const Builder = require('../../builder');

class EnvVarsBuilder extends Builder {
    static get label() {
        return 'Generate core variables page from envVarDefinitions.json';
    }
    init() {
        this._inputPath = 'packages/pwa-buildpack/envVarDefinitions.json';
        this._inputFile = path.join(this.session.projectRoot, this._inputPath);
        this._outputPath =
            'src/_includes/auto-generated/buildpack/reference/envVarDefinitions.md';
        this._outputFile = path.join(this.session.docsRoot, this._outputPath);
        this.inputPaths = [
            this._inputFile,
            // This enables a rebuild if any of the template generators are changed
            path.join(
                path.relative(this.session.docsRoot, __dirname),
                '**/*.js'
            )
        ];
    }
    async onChange() {
        await this.runAll();
    }
    async runAll() {
        this.logger.info('%s => %s', this._inputPath, this._outputPath);
        // Require on every build so that the script can rebuild when it changes
        const generateEnvVarDefinitionDocs = require('./generateEnvVarDefinitionDocs');
        const content = await generateEnvVarDefinitionDocs(this._inputFile);
        await this.session.saveOutput(this._outputFile, content);
    }
}

module.exports = EnvVarsBuilder;
