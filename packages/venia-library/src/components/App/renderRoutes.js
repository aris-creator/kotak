import React from 'react';
import { Switch, Route } from '../../drivers';
import { Page } from '@magento/peregrine';
import ErrorView from '../../components/ErrorView/index';
import CreateAccountPage from '../../components/CreateAccountPage/index';
import Search from '../../RootComponents/Search';

const renderRoutingError = props => <ErrorView {...props} />;

const renderRoutes = () => (
    <Switch>
        <Route exact path="/search.html" component={Search} />
        <Route exact path="/create-account" component={CreateAccountPage} />
        <Route render={() => <Page>{renderRoutingError}</Page>} />
    </Switch>
);

export default renderRoutes;
