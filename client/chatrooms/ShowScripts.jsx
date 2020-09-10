//flow
import React from 'react';
import {inject, observer} from 'mobx-react';
import './Chat.local.css';

@inject('chatStore')
@observer
export default class ShowScripts extends React.Component{
    render(){
        const {chatStore} = this.props;
        let memberRefer = ['A','B','C','D','E'];
        let index = 0;
        const listItems = chatStore.teamOtherMembers.map((item)=> {
            let result = <li key={memberRefer[index]}> Member {memberRefer[index]} refers to {item} in the chatroom.</li>;
            index++;
            return result;
        });  
        
        const questionMsg = <p>Please pay attention to the meaning of member A and member B in the ability evaluation questions:</p>;
        const expertRoleMsg = <p>According to everyone’s previous performance, you play the expert role this time and you are responsible to instruct other members to solve the puzzle.</p>;
        const expertGroupMsg = <p>According to everyone’s previous performance, a member will play the expert role in the group discussion this time and you should post as many questions as possible to get help for solving the puzzle.</p>;
        if(chatStore.teamOtherMembers.length && chatStore.experimentalGroup && chatStore.expertRole){
            return(
                <div className='members-style'>
                    {expertRoleMsg}
                    {questionMsg}
                    <ul>{listItems}</ul>
                </div>
            );
        }
        if(chatStore.teamOtherMembers.length && chatStore.experimentalGroup){
            return(
                <div className='members-style'>
                    {expertGroupMsg}
                    {questionMsg}
                    <ul>{listItems}</ul>
                </div>
            );
        }
        if(chatStore.teamOtherMembers.length){
            return(
                <div className='members-style'>
                    {questionMsg}
                    <ul>{listItems}</ul>
                </div>
            );
        }
        return null;

    }
}