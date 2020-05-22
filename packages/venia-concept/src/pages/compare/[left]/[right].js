import React from 'react';
import { useParams } from 'react-router-dom';
import gql from 'graphql-tag';
import { useQuery } from '@apollo/react-hooks';
import Gallery from '@magento/venia-ui/lib/components/Gallery';

const COMPARE_QUERY = gql`
    query compareProducts($skus: [String]) {
        products(filter: { sku: { in: $skus } }, pageSize: 2) {
            items {
                id
                name
                sku
                small_image {
                    url
                }
                url_key
                price {
                    regularPrice {
                        amount {
                            value
                            currency
                        }
                    }
                }
            }
        }
    }
`;

export default function Comparer() {
    const { left, right } = useParams();
    const { loading, error, data } = useQuery(COMPARE_QUERY, {
        variables: { skus: [left, right] }
    });
    if (loading) {
        return null;
    }
    if (error) {
        throw error;
    }
    return <Gallery items={data.products.items} />;
}
