import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client';

export const useOperationFactory = props => {
    const operationsResultMap = useMemo(() => new Map(), []);
    for (const operationName in props) {
        const isQuery = operationName.includes('Query');
        const operationAST = props[operationName];
        const operationResult = isQuery
            ? useQuery(operationAST)
            : useMutation(operationAST);

        operationsResultMap.set(operationName, operationResult);
    }

    return operationsResultMap;
};
