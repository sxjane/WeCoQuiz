//@flow
import React from 'react';
import { inject, observer} from 'mobx-react';
import { ChatStore } from './../../stores/stores';

type Props = {
  chatStore: any | ChatStore
};

@inject('chatStore')
@observer
export default class AutoAssignTeams extends React.Component<Props> {
  static defaultProps = {
    chatStore: null
  };

  forceMembersLeave(){
    this.props.chatStore.leaveAutoAssignTeams();
  }

  render() {
    const { chatStore } = this.props;
    if (typeof chatStore.showAssignTeamButton !== 'undefined') {
      if (chatStore.showAssignTeamButton) {
        return (
          <div>
            <button onClick={chatStore.autoAssignTeams.bind(chatStore)}>
              AutoAssignMembers
            </button>
          </div>
        );
      } else {
        return (
          <div>
            <button  onClick={() => { if (window.confirm('Are you sure you wish to stop the group chat?')) this.forceMembersLeave();} }> 
            MembersLeave
            </button>
          </div>
        );
      }
    } else {
      return 'loading.';
    }
  }
}
