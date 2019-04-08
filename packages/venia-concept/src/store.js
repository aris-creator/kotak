import { createStore } from 'redux';

import middleware from '@magento/venia-library/middleware';
import errorHandler from '@magento/venia-library/middleware/errorHandler';
import reducer from '@magento/venia-library/reducers';
import composeEnhancers from '@magento/venia-library/util/composeEnhancers';

export default createStore(reducer, composeEnhancers(middleware, errorHandler));
