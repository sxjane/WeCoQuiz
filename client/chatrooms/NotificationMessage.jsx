//@flow
import React from 'react';
import './Chat.local.css';

type Props = {
    msg:string;
}

export default class NotificationMessage extends React.Component<Props>{
    static defaultProps = {
        msg:''
    };

    render(){
        return (
            <div className='msg-notify'>
                <p>{this.props.msg}</p>
            </div>
        );
    }
}