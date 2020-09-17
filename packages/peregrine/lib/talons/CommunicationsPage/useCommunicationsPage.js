import { useCallback, useMemo } from 'react';

import { useUserContext } from '../../context/user';
import DEFAULT_OPERATIONS from './communicationsPage.gql';
import { useOperationFactory } from '../../hooks/useOperationFactory';

export const useCommunicationsPage = props => {
    const { afterSubmit, operations = DEFAULT_OPERATIONS } = props;

    const [{ isSignedIn }] = useUserContext();

    const operationResults = useOperationFactory(operations);
    const getCustomerSubscriptionResult = operationResults.get(
        'getCustomerSubscriptionQuery'
    );
    const setNewsletterSubscriptionResult = operationResults.get(
        'setNewsletterSubscriptionMutation'
    );

    const {
        data: subscriptionData,
        error: subscriptionDataError
    } = getCustomerSubscriptionResult;

    const initialValues = useMemo(() => {
        if (subscriptionData) {
            return { isSubscribed: subscriptionData.customer.is_subscribed };
        }
    }, [subscriptionData]);

    const [
        setNewsletterSubscription,
        { error: setNewsletterSubscriptionError, loading: isSubmitting }
    ] = setNewsletterSubscriptionResult;

    const handleSubmit = useCallback(
        async formValues => {
            try {
                await setNewsletterSubscription({
                    variables: formValues
                });
            } catch {
                // we have an onError link that logs errors, and FormError already renders this error, so just return
                // to avoid triggering the success callback
                return;
            }
            if (afterSubmit) {
                afterSubmit();
            }
        },
        [setNewsletterSubscription, afterSubmit]
    );

    return {
        formErrors: [setNewsletterSubscriptionError, subscriptionDataError],
        initialValues,
        handleSubmit,
        isDisabled: isSubmitting,
        isSignedIn,
        operationResults
    };
};
