/* @flow */
import React, { Fragment } from 'react';
import { inject, observer } from 'mobx-react';
import classNames from 'classnames';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import _ from 'lodash';

import styles from './../stream/collaboration/TeamOverview.local.scss';

import { Stream as StreamModel } from './../../stores/models/models';
import { CollabStore } from './../../stores/stores';

type Props = {
  collabStore: any | CollabStore,
  stream: StreamModel
};

@inject('collabStore','chatStore')
@observer
export default class AutoJoinTeamList extends React.Component<Props> {
  static defaultProps = {
    collabStore: null,
    chatStore: null
  };
    
  getTeamMemberRepresentation(
    maxMembers: number,
    numberOfMembers: number,
    teamId: string
  ) {
    return (
      <Fragment>
        {_.map(_.range(0, maxMembers), (member, index) => (
          <FontAwesomeIcon
            key={`${teamId}${index}`}
            icon="user"
            style={{ color: numberOfMembers > index ? '#333333' : '#A2A2A2' }}
            className="mx-1"
          />
        ))}
      </Fragment>
    );
  }

  getEditTeamRow({
    teamName,
    teamId,
    maxMembers,
    numberOfMembers
  }: {
    teamName: string,
    teamId: string,
    maxMembers: number,
    numberOfMembers: number
  }) {
    return (
      <div
        className={classNames('d-flex', 'w-100', 'p-1', styles.item)}
        key={teamId}>
        <div className="flex-1 pl-2">{`Team ${teamName}`}</div>
        <div className="flex-1 d-flex justify-content-end align-items-center">
          {this.getTeamMemberRepresentation(
            maxMembers,
            numberOfMembers,
            teamId
          )}
        </div>
      </div>
    );
  }

  render() { 
    if(this.props.chatStore.teamId){
      return (
        <div className={classNames(styles.teamList, 'mt-2')}>
          {this.props.collabStore.teamData.filter(item => item.teamId == this.props.chatStore.teamId).map(this.getEditTeamRow.bind(this))}
        </div>
      );
    }else{
      return null;
    }
  }
}
