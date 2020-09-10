/* @flow */
import React from 'react';
import { inject, observer } from 'mobx-react';
import { Widget, dropMessages} from 'react-chat-widget';
import 'react-chat-widget/lib/styles.css';
import { Stream as StreamModel } from '../../stores/models/models';
import {ChatStore, CollabStore} from '../../stores/stores';
import {ChatString} from './../../../share/enumerations';
import './Chat.local.css';

type Props = {
  stream: StreamModel,
  chatStore: null | ChatStore,
  collabStore: null | CollabStore,
  myself: any | {id:string, username:string}
};

@inject('myself', 'chatStore', 'collabStore')
@observer
export default class ChatRoom extends React.Component<Props> {

  static defaultProps = {
    stream: null,
    chatStore: null,
    collabStore: null,
    myself: null
  };

  constructor(props){
    super(props);
    this.currentTeamUsers = '';
    this.teamName = '';
    this.userInfo = '';
    this.handleNewUserMessage = this.handleNewUserMessage.bind(this);
  }
  
  componentWillUnmount(){
    dropMessages();
    this.props.chatStore.leaveChatForMoment();
  }

  handleNewUserMessage(newMessage){
    const {stream, chatStore} = this.props;
    if(stream.isLecturer || stream.course.isCreator){
      chatStore.sendToAllStudents(newMessage);
    }else{
      chatStore.sendToChatroom(newMessage);
    }
  }

  render() {
    const{chatStore,myself} = this.props;
    if(chatStore.experimentalGroup && chatStore.expertRole){
      this.userInfo = myself.username + ChatString.EXPERT_TITLE;
    }else{
      this.userInfo = myself.username;
    }
    if(chatStore.currentTeamUsers){
      this.currentTeamUsers = ' (' + ChatString.ONLINE_USERS + chatStore.currentTeamUsers + ')';
    }
    if(chatStore.teamName){
      this.teamName = ': ' + 'Team ' + chatStore.teamName;
    }

    let title = this.userInfo + this.teamName + this.currentTeamUsers;
    return (
      <div className="App">
        <Widget
          title={title}
          subtitle=''
          handleNewUserMessage={this.handleNewUserMessage}
        />
      </div>
    );
  }
}
