import React, { useEffect } from 'react';
import { Link } from '@magento/venia-drivers';
import { useQuery } from '@magento/peregrine';
import RichContent from '../../components/RichContent';
import CategoryList from '../../components/CategoryList';
import cmsPageQuery from '../../queries/getCmsPage.graphql';
import { fullPageLoadingIndicator } from '../../components/LoadingIndicator';

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
                <CategoryList title="Shop by category" id={2} />
            </div>
        );
}
    return null;
};

export default CMSPage;
