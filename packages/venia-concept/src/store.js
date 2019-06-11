import { createStore } from 'redux';

import middleware from '@magento/venia-library/src/middleware';
import errorHandler from '@magento/venia-library/src/middleware/errorHandler';
import reducer from '@magento/venia-library/src/reducers';
import composeEnhancers from '@magento/venia-library/src/util/composeEnhancers';

export default createStore(reducer, composeEnhancers(middleware, errorHandler));
