const TargetableReactComponent = require('../TargetableReactComponent');

const checkboxSource = `import { Component, lazy } from 'react';
export function Checkbox(props) {
    const { classes, fieldState, id, label, message, ...rest } = props;
    const { value: checked } = fieldState;
    const icon = checked ? checkedIcon : uncheckedIcon;

    return (
        <Fragment>
            <label className={classes.root} htmlFor={id}>
                <BasicCheckbox
                    {...rest}
                    className={classes.input}
                    fieldState={fieldState}
                    id={id}
                />
                <span className={classes.icon}>{icon}</span>
                <span className={classes.label}>{label}</span>
            </label>
            <Message fieldState={fieldState}>{message}</Message>
        </Fragment>
    );
}
`;

const fileToTransform = '/path/to/Checkbox.js';
const CheckboxModule = new TargetableReactComponent(fileToTransform, () => {});
const latestTransform = () =>
    CheckboxModule._queuedTransforms[
        CheckboxModule._queuedTransforms.length - 1
    ];

test('.addLazyReactComponentImport()', () => {
    CheckboxModule.addLazyReactComponentImport(
        './path/to/dynamic/component',
        'Blerg'
    );
    expect(latestTransform()).toMatchSnapshot();
});
describe('JSX manipulation', () => {
    it('.appendJSX()', () => {
        CheckboxModule.appendJSX(
            'span className={classes.icon}',
            '<AnotherEmoji />'
        );
        expect(latestTransform()).toMatchSnapshot();
    });
    it('.insertAfterJSX()', () => {
        CheckboxModule.insertAfterJSX('<Message>', '<Rakim />');
        expect(latestTransform()).toMatchSnapshot();
    });
    it('.insertBeforeJSX()', () => {
        CheckboxModule.insertBeforeJSX('<Message>', '<EricB and={and} />');
        expect(latestTransform()).toMatchSnapshot();
    });
    it('.prependJSX()', () => {
        CheckboxModule.prependJSX(
            '<span className={classes.icon} />',
            '<AnEmoji/>'
        );
        expect(latestTransform()).toMatchSnapshot();
    });
    it('.removeJSX()', () => {
        CheckboxModule.removeJSX('AnotherEmoji');
        expect(latestTransform()).toMatchSnapshot();
    });
    it('.removeJSXProps()', () => {
        CheckboxModule.removeJSXProps('BasicCheckbox', ['fieldState', 'id']);
        expect(latestTransform()).toMatchSnapshot();
    });
    it('.replaceJSX()', () => {
        CheckboxModule.replaceJSX(
            'span className={classes.label}',
            '<i>where is label oh no</i>'
        );
        expect(latestTransform()).toMatchSnapshot();
    });
    it('.setJSXProps()', () => {
        CheckboxModule.setJSXProps('BasicCheckbox', {
            key: '{NUMBER}',
            className: '{classes.wildin}'
        });
        expect(latestTransform()).toMatchSnapshot();
    });
    it('.surroundJSX()', () => {
        CheckboxModule.surroundJSX('label', '<fieldset></fieldset>');
        expect(latestTransform()).toMatchSnapshot();
    });

    it('really ties the room together', async () => {
        const babel = require('@babel/core');
        const { code } = await babel.transformAsync(checkboxSource, {
            plugins: [
                [
                    require.resolve('../BabelModifyJSXPlugin/plugin.js'),
                    {
                        requestsByFile: {
                            [fileToTransform]: CheckboxModule.flush().filter(
                                r =>
                                    r.transformModule.includes(
                                        'BabelModifyJSXPlugin'
                                    )
                            )
                        }
                    }
                ]
            ],
            filename: fileToTransform
        });
        expect(code).toMatchSnapshot();
    });
});
