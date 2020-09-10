const Routes = require('./../../share/routes');
const {ChatString} = require('./../../share/enumerations');
const calculateExperts = require('./chatAutoTeams/calculateExperts');
const {createGroups, autoJoinTeams} = require('./chatAutoTeams/chatUtilities');

module.exports = (io, {chatDAO}, socket) => {

  socket.on(Routes.CHAT_JOIN_STREAMID, (streamId) => {
      socket.join(streamId);
  });

  socket.on(Routes.CHAT_AUTO_JOIN_GROUPS, async (courseId, courseMaterialId, unitId, streamId) => {
    let results;
    try{
      results = await calculateExperts(chatDAO, courseId, courseMaterialId);
    }catch(error){
      console.log('calculateExperts failed and error is:', error);
      socket.emit(Routes.CHAT_AUTO_JOIN_GROUPS, ChatString.AUTO_JOIN_GROUP_FAIL);
      return;
    }

    let resultsIds = results.resultsIds;
    let scoresId = results.insertScoresId;
    let groups;
    try {
      groups = await createGroups(resultsIds, streamId, chatDAO, results.ifPreTest);
      await chatDAO.insertGroups(streamId, unitId, scoresId, groups);
    } catch (error) {
      console.log(error);
      socket.emit(Routes.CHAT_AUTO_JOIN_GROUPS, ChatString.AUTO_JOIN_GROUP_FAIL);
    }

    if(groups){
      try {
        await autoJoinTeams(groups,streamId, chatDAO);
        io.to(streamId).emit(Routes.CHAT_AUTO_JOIN_GROUPS, ChatString.AUTO_JOIN_GROUP_SUCCESS);
      } catch (error) {
        console.log(error);
        socket.emit(Routes.CHAT_AUTO_JOIN_GROUPS, ChatString.AUTO_JOIN_GROUP_FAIL);
      }
    }else{
      socket.emit(Routes.CHAT_AUTO_JOIN_GROUPS, ChatString.AUTO_JOIN_GROUP_FAIL);
    }
  });

  socket.on(Routes.CHAT_GET_USERS_TEAM_AND_JOIN, async (streamId, userId, userName) => {
    try {
      let team = await chatDAO.getTeamByUserId(userId, streamId);
      if(team[0]){
      let teamId = team[0].teamId;
      let experimentalGroup = team[0].experimentalGroup;
      socket.userName = userName;
      socket.teamId = teamId;
      socket.join(teamId);
      let membersInfo = await chatDAO.getMembersByTeamId(teamId);
      let members = membersInfo.map(item => item.userName);
      let otherMembers = members.filter(item => item !== userName);
      socket.emit(Routes.CHAT_GET_USERS_TEAM_AND_JOIN, teamId, team[0].expertRole, team[0].teamName, experimentalGroup, otherMembers);
    }else{
      socket.emit(Routes.CHAT_GET_USERS_TEAM_AND_JOIN, null, null, null, null, null, null);
    }
    } catch (error) {
      console.log(error);
      socket.emit(Routes.CHAT_GET_USERS_TEAM_AND_JOIN, null, null, null, null, null, null);
    }
    
  });

  socket.on(Routes.CHAT_SEND_A_MESSAGE, async (chatMsg) => {
    try {
      await chatDAO.insertChatMessage(chatMsg);
      if(chatMsg.teamId){
        socket.to(chatMsg.teamId).broadcast.emit(Routes.CHAT_GET_A_MESSAGE, chatMsg);
      }
    } catch (error) {
      console.log(error);
    }
  });

  socket.on(Routes.CHAT_SEND_TO_ALL, async (chatMsg) => {
    try {
      let streamId = chatMsg.streamId;
      socket.to(streamId).broadcast.emit(Routes.CHAT_SEND_TO_ALL, chatMsg);
    } catch (error) {
      console.log(error);
    }
  });

  socket.on(Routes.CHAT_AUTO_LEAVE_GROUPS, async (streamId) => {
    try {
      await chatDAO.setNumberOfMembersZero(streamId);
      await chatDAO.deleteChatUsers(streamId);
      //await chatDAO.deleteChatMessages(streamId);
      //await chatDAO.deleteChatScores(streamId);
      //await chatDAO.deleteChatGroups(streamId);
      
      io.to(streamId).emit(Routes.CHAT_AUTO_LEAVE_GROUPS, ChatString.AUTO_LEAVE_GROUP_SUCCESS);
    } catch (error) {
      console.log(error); 
      socket.emit(Routes.CHAT_AUTO_LEAVE_GROUPS, ChatString.AUTO_LEAVE_GROUP_FAIL);
    }
  });

  socket.on(Routes.CHAT_CHECK_SHOW_ASSIGN_BUTTON, async (streamId) => {
    let msg = true;
    try {
      let teams = await chatDAO.getTeamsByStreamId(streamId);
      for(let i = 0; i < teams.length; i++){
        if(teams[i].numberOfMembers){
          msg = false;
          break;
        }
      }
      socket.emit(Routes.CHAT_CHECK_SHOW_ASSIGN_BUTTON, msg);
    } catch (error) {
      console.log(error);
    }
  });

  socket.on(Routes.CHAT_GET_CURRENT_ONLINE_MEMBERS, (teamId) => {
    try {
      let num = 0;
      let clients = io.adapter.rooms[teamId];
      if(clients){
        num = clients.length;
      }
      socket.emit(Routes.CHAT_GET_CURRENT_ONLINE_MEMBERS, num);
    } catch (error) {
      console.log(error);
    }
  });

  socket.on(Routes.CHAT_USER_END_CHAT,(teamId) => {
    socket.leave(teamId);
    socket.emit(Routes.CHAT_USER_END_CHAT);
  });

  socket.on(Routes.CHAT_USER_IN_CHATROOM, async (userName, teamId) => {
    let teamMessages = await chatDAO.getTeamMessagesByTeamId(teamId);
    socket.emit(Routes.CHAT_USER_IN_CHATROOM, ChatString.SELF_JOIN_MESSAGE, teamMessages);
    socket.to(teamId).broadcast.emit(Routes.CHAT_USER_IN_CHATROOM, userName + ChatString.JOIN_MESSAGE, null);
  });

  socket.on(Routes.CHAT_USER_LEAVE_FOR_MOMENT, (teamId, userName)=> {
    socket.leave(teamId);
    socket.to(teamId).broadcast.emit(Routes.CHAT_UPDATE_CURRENT_ONLINE_MEMBERS, userName + ChatString.LEAVE_MESSAGE);
  });

  socket.on('disconnect',()=>{
    io.to(socket.teamId).emit(Routes.CHAT_UPDATE_CURRENT_ONLINE_MEMBERS, socket.userName + ChatString.LEAVE_MESSAGE);
  });
};
