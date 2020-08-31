const { inspect } = require('util');
const path = require('path');
const HookInterceptorSet = require('../HookInterceptorSet');
const targetSerializer = require('../JestPeregrineTargetSerializer');

expect.addSnapshotSerializer(targetSerializer);

// Since fast-glob doesn't return in reliable order (it sacrifices that for
// speed), we sort the results so the snapshot stays deterministic. Don't
// need to do this in runtime!
const sortByFilename = (a, b) =>
    (a.fileToTransform > b.fileToTransform && 1) ||
    (b.fileToTransform > a.fileToTransform && -1) ||
    0;

describe('HookInterceptorSet for talons target API', () => {
    let wrappers;
    beforeAll(async () => {
        wrappers = new HookInterceptorSet(
            path.resolve(__dirname, '../../talons/')
        );
        await wrappers.populate();
    });
    test('exposes each talon under namespace hierarchy following directory structure', () => {
        expect(wrappers).toMatchSnapshot();
    });

    test('stores a queue of transform requests for talon files', () => {
        wrappers.Accordion.useAccordion.wrapWith(() => 'an inline function!');
        wrappers.AccountChip.useAccountChip.wrapWith('dust');
        wrappers.AccountMenu.useAccountMenuItems.wrapWith('drapes');
        wrappers.App.useApp.wrapWith('bunting');
        wrappers.AuthBar.useAuthBar.wrapWith('lace');
        wrappers.AuthModal.useAuthModal.wrapWith('muslin');
        wrappers.Breadcrumbs.useBreadcrumbs.wrapWith('egg');
        wrappers.CartPage.useCartPage.wrapWith('silk');
        wrappers.CartPage.GiftCards.useGiftCard.wrapWith('envelope');
        wrappers.CartPage.GiftCards.useGiftCards.wrapWith('ribbons');

        expect(wrappers.flush().sort(sortByFilename)).toMatchSnapshot();
    });
});

describe('HookInterceptorSet for hooks target API', () => {
    let wrappers;
    beforeAll(async () => {
        wrappers = new HookInterceptorSet(
            path.resolve(__dirname, '../../hooks/')
        );
        await wrappers.populate();
    });
    test('exposes each hook under namespace hierarchy following directory structure', () => {
        expect(wrappers).toMatchSnapshot();
    });

    test('stores a queue of transform requests for hook files', () => {
        wrappers.useAwaitQuery.wrapWith('frosting');
        wrappers.useCarousel.wrapWith('wd-40');
        wrappers.useDropdown.wrapWith('curtains');
        wrappers.useEventListener.wrapWith('fanfare');
        wrappers.usePagination.wrapWith('knickknacks');
        wrappers.useResetForm.wrapWith('unsettery');
        wrappers.useRestApi.wrapWith('en passant');
        wrappers.useRestResponse.wrapWith('indolence');
        wrappers.useScrollIntoView.wrapWith('physics');
        wrappers.useScrollLock.wrapWith('crisis');
        wrappers.useScrollTopOnChange.wrapWith('mutability');
        wrappers.useSearchParam.wrapWith('optimism');
        wrappers.useSort.wrapWith('intent');
        wrappers.useWindowSize.wrapWith('disbelief');

        expect(wrappers.flush().sort(sortByFilename)).toMatchSnapshot();
    });
});
