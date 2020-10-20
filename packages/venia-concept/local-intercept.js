function localIntercept(targets) {
    const { Targetables } = require("@magento/pwa-buildpack")
    const targetables = Targetables.using(targets)

    // target a component
    const main = targetables.reactComponent(
        "@magento/venia-ui/lib/components/Main/main.js"
    )

    // add imports to it
    const Demo = main.addImport(
        "Demo from '@magento/venia-concept/src/components/Demo'"
    )

    // remove its existing children, then add new ones
    main
        .removeJSX("Header")
        .removeJSX("Footer")
        .removeJSX("div className={pageClass}")
        .prependJSX("main", `<${Demo} />`)
}

module.exports = localIntercept;
