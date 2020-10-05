/**
 * @module VeniaUI/Targets
 */
const RichContentRendererList = require('./RichContentRendererList');
const RouteList = require('./RouteList');

/**
 * TODO: This code intercepts the Webpack module for a specific file in this
 * package. That will be a common enough pattern that it should be turned into
 * a utility function.
 */

module.exports = targets => {
    const builtins = targets.of('@magento/pwa-buildpack');

    builtins.specialFeatures.tap(featuresByModule => {
        featuresByModule['@magento/venia-ui'] = {
            cssModules: true,
            esModules: true,
            graphqlQueries: true,
            rootComponents: true,
            upward: true,
            i18n: true
        };
    });

    const richContentRenderers = RichContentRendererList.connect(targets);
    richContentRenderers.add({
        componentName: 'PlainHtmlRenderer',
        importPath: './plainHtmlRenderer'
    });

    const routes = RouteList.connect(targets);
    routes.add([
        // The paths below are relative to lib/components/Routes/routes.js.
        {
            name: 'AddressBook',
            pattern: '/address-book',
            exact: true,
            path: '../AddressBookPage'
        },
        {
            name: 'Cart',
            pattern: '/cart',
            exact: true,
            path: '../CartPage'
        },
        {
            name: 'CheckoutPage',
            pattern: '/checkout',
            exact: true,
            path: '../CheckoutPage'
        },
        {
            name: 'CommunicationsPage',
            pattern: '/communications',
            exact: true,
            path: '../CommunicationsPage'
        },
        {
            name: 'CreateAccountPage',
            pattern: '/create-account',
            exact: true,
            path: '../CreateAccountPage'
        },
        {
            name: 'OrderHistory',
            pattern: '/order-history',
            exact: true,
            path: '../OrderHistoryPage'
        },
        {
            /**
             * This path is configured in the forgot password
             * email template in the admin panel.
             */
            name: 'Reset Password',
            pattern: '/customer/account/createPassword',
            exact: true,
            path: '../MyAccount/ResetPassword'
        },
        {
            name: 'SavedPayments',
            pattern: '/saved-payments',
            exact: true,
            path: '../SavedPaymentsPage'
        },
        {
            name: 'Search',
            pattern: '/search.html',
            exact: true,
            path: '../../RootComponents/Search'
        },
        {
            name: 'WishlistPage',
            pattern: '/wishlist',
            exact: true,
            path: '../WishlistPage'
        },
        {
            name: 'AccountInformationPage',
            pattern: '/account-information',
            exact: true,
            path: '../AccountInformationPage'
        }
    ]);

    const { transformModules } = targets.of('@magento/pwa-buildpack');
    const { Targetables } = require('@magento/pwa-buildpack');
    const targetables = Targetables.using(targets);

    const ProductDetail = targetables.reactComponent(
        '@magento/venia-ui/lib/components/ProductFullDetail/productFullDetail.js'
    );
    ProductDetail.prependJSX(
        'section data-targetable-id="actions"',
        '<Button> Add to List </Button>'
    );

    transformModules.tap(async addTransform => {
        const list = await targets.own.buttonActions.promise([]);
        list.forEach(t =>
            ProductDetail.prependJSX('section data-targetable-id="actions"', t)
        );

        ProductDetail.flush().forEach(addTransform);
    });
};
