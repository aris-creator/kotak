const fs = require('fs');
const { root } = require('mdast-builder');
const unified = require('unified');
const stringify = require('remark-stringify');

/**
 * A function for generating markdown content from an envVarDefinitions file
 *
 * @param {string} filepath The filepath to the envVarDefinitions file
 *
 * @returns {string} A markdown formatted string containing documentation from data in the envVarDefinitions file
 */
module.exports = (filepath) => {
    const handleSection = require('./handleSection');
    const fileContent = JSON.parse(fs.readFileSync(filepath));

    const { sections } = fileContent;

    let tree = root([]);

    sections.forEach((section) => {
        tree.children = tree.children.concat(handleSection(section));
    });

    const builder = unified().use(stringify, {});

    const result = builder.stringify(tree);

    return result;
};
