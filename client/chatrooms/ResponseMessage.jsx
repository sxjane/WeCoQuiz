//@flow
import React from 'react';
import 'react-chat-widget/lib/styles.css';
import './Chat.local.css';
import {ChatString} from './../../../share/enumerations';
import {inject, observer} from 'mobx-react';
import {ChatStore} from './../../stores/stores';

type Props = {
    chatStore: any | ChatStore,
    userName: string,
    userContent: string,
    expertRole: boolean,
};

@inject('chatStore')
@observer
export default class ResponseMessage extends React.Component<Props>{
    static defaultProps={
        chatStore: null,
        userName: '',
        userContent: '',
        expertRole: false
    };

    render(){
        let responseClassName = 'msg-response';
        let header;

        if(this.props.experimentalGroup && this.props.expertRole){
            responseClassName += ' ' + 'msg-expert-color';
            header = ChatString.SHOW_EXPERT + this.props.userName;
        }else{
            responseClassName += ' ' + 'msg-color';
            header = this.props.userName;
        }
        
        return(
            <div>
                <div className='msg-header'>
                    <p>{header}</p>
                </div>
                <div className={responseClassName}>
                    <p>{this.props.userContent}</p>
                </div>
            </div>
        );
    }
} 