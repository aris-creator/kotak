/* eslint-disable */
/**
 * Custom interceptors for the project.
 *
 * This project has a section in its package.json:
 *    "pwa-studio": {
 *        "targets": {
 *            "intercept": "./local-intercept.js"
 *        }
 *    }
 *
 * This instructs Buildpack to invoke this file during the intercept phase,
 * as the very last intercept to run.
 *
 * A project can intercept targets from any of its dependencies. In a project
 * with many customizations, this function would tap those targets and add
 * or modify functionality from its dependencies.
 */

function localIntercept(targets) {
    // const { transformModules } = targets.of('@magento/pwa-buildpack');
    // const { Targetables } = require('@magento/pwa-buildpack');
    // const targetables = Targetables.using(targets);
    // const Paginator = targetables.reactComponent(
    //     '@magento/venia-ui/lib/components/Pagination/pagination.js'
    // );
    // Paginator.setJSXProps(
    //     'NavButton active={isActiveRight}',
    //     {
    //         buttonLabel: '"➡️"'
    //     },
    //     { global: true }
    // );
    // const MainComponent = targetables.reactComponent(
    //     '@magento/venia-ui/lib/components/Main/main.js'
    // );
    // const Button = MainComponent.addImport(
    //     "Button from '@magento/venia-ui/lib/components/Button'"
    // );
    // MainComponent.appendJSX(
    //     'div className={pageClass}',
    //     '<span>appendJSX succeeded!</span>'
    // )
    //     .insertAfterJSX(
    //         '<Footer/>',
    //         `<${Button} type="button" priority="high">insertAfterJSX succeeded!</${Button}>`
    //     )
    //     .insertBeforeJSX(
    //         '<Header />',
    //         '<span>insertBeforeJSX succeeded!</span>'
    //     )
    //     .insertAfterJSX(
    //         'Header',
    //         '<span id={`${dot.path}`}>replaceJSX did NOT work, it did NAAAAHT!!</span>'
    //     )
    //     .replaceJSX('span id={`${dot.path}`}', '<span>replaceJSX worked</span>')
    //     .prependJSX('div', '<>prependJSX succeeded!</>')
    //     .removeJSX('span className="busted"')
    //     .setJSXProps('Footer', {
    //         'aria-role': '"footer"',
    //         'data-set-jsx-props-succeeded': true
    //     })
    //     .surroundJSX(
    //         'Header',
    //         `div style={{ filter: "blur(1px)", outline: "2px dashed red" }}`
    //     )
    //     .insertBeforeJSX(
    //         'Footer aria-role="footer"',
    //         '<span>Cumulative select worrrrrked</span>'
    //     );
    // transformModules.tap(addTransform => {
    //     MainComponent.flush().forEach(addTransform);
    //     Paginator.flush().forEach(addTransform);
    // });
}

module.exports = localIntercept;
