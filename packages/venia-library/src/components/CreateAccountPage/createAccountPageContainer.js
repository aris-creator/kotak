import { connect } from '../../drivers';
import { createAccount } from '../../actions/createAccountPage';
import CreateAccountPage from './createAccountPage';

export default connect(
    null,
    { createAccount }
)(CreateAccountPage);
