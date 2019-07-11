import React, { useEffect, useState } from 'react';
// import RichText from 'src/components/RichText';
import { fullPageLoadingIndicator } from 'src/components/LoadingIndicator';

const AEMPage = props => {
    const { id } = props;

    const [contents, setContents] = useState();
    useEffect(() => {
        async function fetchAEM() {
            const url = new URL(
                `/content/${process.env.AEM_SLUG}/us/en/${id}.model.json`,
                window.location
            );
            const res = await fetch(url, {
                credentials: 'include'
            });
            setContents(await res.json());
        }
        fetchAEM();
    }, [id]);

    if (contents) {
        return (
            <code>
                <pre>{JSON.stringify(contents, null, 2)}</pre>
            </code>
        );
    }
    return fullPageLoadingIndicator;
};

export default AEMPage;
