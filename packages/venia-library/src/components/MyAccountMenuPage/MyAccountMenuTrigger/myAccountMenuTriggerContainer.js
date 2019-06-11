import { connect } from '../../../drivers';
import { getUserInformation } from '../../../selectors/user';
import MyAccountMenuTrigger from './myAccountMenuTrigger';

export default connect(state => ({
    user: getUserInformation(state)
}))(MyAccountMenuTrigger);
