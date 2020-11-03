import React, { useCallback, useMemo } from 'react';
import Select from 'react-select';

const FancySelect = props => {
    const { disabled, fieldApi, fieldState, forwardedRef, options } = props;
    const { setValue, setTouched } = fieldApi;

    const handleBlur = useCallback(() => {
        setTouched(true);
    }, [setTouched]);

    const handleChange = useCallback(
        nextValue => {
            setValue(nextValue.value);
        },
        [setValue]
    );

    const value = useMemo(() => {
        const { value: rawValue } = fieldState || {};

        return rawValue || rawValue === 0 ? rawValue : '';
    }, [fieldState]);

    return (
        <Select
            ref={forwardedRef}
            disabled={disabled}
            onBlur={handleBlur}
            onChange={handleChange}
            options={options}
            styles={styles}
            value={value}
        />
    );
};

export default FancySelect;

const styles = {
    control: base => ({
        ...base,
        borderColor: 'rgb(var(--venia-global-color-gray-600))',
        borderRadius: 6,
        borderWidth: 2
    }),
    menu: base => ({
        ...base,
        zIndex: 5
    })
};
