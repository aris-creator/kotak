/**
 * @RootComponent
 * description = 'PageBuilder Parsing CMS Page'
 * pageTypes = CMS_PAGE
 */
import React, { useEffect } from 'react';
import { useQuery } from '@magento/peregrine';
import RichContent from '../components/RichContent';
import cmsPageQuery from '@magento/venia-ui/lib/queries/getCmsPage.graphql';
import { fullPageLoadingIndicator } from '@magento/venia-ui/lib/components/LoadingIndicator';

const CMSPage = props => {
    const { id } = props;
    const [queryResult, queryApi] = useQuery(cmsPageQuery);
    const { data, error, loading } = queryResult;
    const { runQuery, setLoading } = queryApi;

    useEffect(() => {
        setLoading(true);
        runQuery({
            variables: {
                id: Number(id),
                onServer: false
            }
        });
    }, [id, runQuery, setLoading]);

    if (error) {
        return <div>Page Fetch Error</div>;
    }

    if (loading) {
        return fullPageLoadingIndicator;
    }

    if (data) {
        return (
            <div>
                <RichContent html={data.cmsPage.content} />
            </div>
        );
}
    return null;
};

export default CMSPage;
