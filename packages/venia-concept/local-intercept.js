/* eslint-disable */

function localIntercept(targets) {
    const { Targetables } = require('@magento/pwa-buildpack');
    const targetables = Targetables.using(targets);

    const Select = targetables.reactComponent(
        '@magento/venia-ui/lib/components/Select/select.js'
    );
    const FancySelect = Select.addImport(
        "FancySelect from '@magento/venia-concept/src/components/FancySelect'"
    );

    Select.replaceJSX(
        'FieldIcons',
        `<${FancySelect} {...rest} fieldState={fieldState} options={items} />`
    );
}

module.exports = localIntercept;
