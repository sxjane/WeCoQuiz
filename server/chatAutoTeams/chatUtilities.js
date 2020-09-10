const {ChatString} = require('./../../../share/enumerations');
const EXPERIMENT_ARGUMENT = 'experiment';

async function createGroups(resultsIds, streamId, chatDAO, ifPreTest){
    let expertsIds = resultsIds.expertsIds;
    let nonExpertsIds = resultsIds.nonExpertsIds;
    if(expertsIds.length === 0 && nonExpertsIds.length === 0){
      return null;
    }

    shuffle(expertsIds);
    shuffle(nonExpertsIds);
  
    let teams = await chatDAO.getTeamsByStreamId(streamId);
    let expertGroups = [];
    let expIndex = 0;
    let nonExpIndex = 0;
    let teamIndex = -1;
    let experimentalGroup;
  
    if((expertsIds.length + nonExpertsIds.length) > teams.length * teams[0].maxMembers){
      throw 'there are not enough teams';
    }
  
    for(; expIndex < expertsIds.length; expIndex++){
      teamIndex = expIndex;
      let teamId = teams[teamIndex].id;
      let teamName = teams[teamIndex].teamName;
      let maxMembers = teams[teamIndex].maxMembers;
      let numberOfCurrentMembers = teams[teamIndex].numberOfMembers;
      if(numberOfCurrentMembers){
        throw 'there are already members, then auto assign teams fails';
      }
      let expert= expertsIds[expIndex];
      let groupWithExpert = true;
      let nonExperts;
      let anotherNonIndex = nonExpIndex + maxMembers - 1;
      nonExperts = nonExpertsIds.slice(nonExpIndex, anotherNonIndex);
      nonExpIndex = anotherNonIndex;

      var IF_EXPERIMENT_GROUP;
      if(EXPERIMENT_ARGUMENT === ChatString.IN_CONTROL){
        IF_EXPERIMENT_GROUP = false;
      }else if (EXPERIMENT_ARGUMENT === ChatString.IN_EXPERIMENT){
        IF_EXPERIMENT_GROUP = true;
      }else{
        IF_EXPERIMENT_GROUP = false;
      }
      if(ifPreTest){
        experimentalGroup = false;
      }else{
        experimentalGroup = IF_EXPERIMENT_GROUP;
      }

      expertGroups.push({
        teamId,
        teamName,
        expert,
        nonExperts,
        groupWithExpert,
        experimentalGroup
      });
    }
  
    let nonExpertGroups=[];
    teamIndex++;
    if(nonExpIndex < nonExpertsIds.length){
      let teamId = teams[teamIndex].id;
      let teamName = teams[teamIndex].teamName;
      let numberOfCurrentMembers = teams[teamIndex].numberOfMembers;
      if(numberOfCurrentMembers){
        throw 'there are already members, then auto assign teams fails';
      }
      let nonExperts = nonExpertsIds.slice(nonExpIndex);
      let groupWithExpert = false;
      experimentalGroup = false;
      nonExpertGroups.push({
        teamId,
        teamName,
        nonExperts,
        groupWithExpert,
        experimentalGroup,
      });
    }
    let results = expertGroups.concat(nonExpertGroups);
    return results;
  };
  
  function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
  
    while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
  }
  
  async function autoJoinTeams(groups, streamId, chatDAO){
    let expertGroups = groups.filter(item => item.groupWithExpert === true);
    let nonExpertGroups = groups.filter(item => item.groupWithExpert === false);
  
    if(expertGroups.length){
      for(let i = 0; i < expertGroups.length; i++){
        let expert = expertGroups[i].expert;
        let teamId = expertGroups[i].teamId;
        let teamName = expertGroups[i].teamName;
        let experimentalGroup = expertGroups[i].experimentalGroup;
        await chatDAO.insertUsersInGroups(streamId, teamId, expert, ChatString.YES_EXPERT, teamName, experimentalGroup);
        let nonExperts = expertGroups[i].nonExperts;
        for(let pos = 0; pos < nonExperts.length; pos++){
          await chatDAO.insertUsersInGroups(streamId, teamId, nonExperts[pos], ChatString.NO_EXPERT, teamName, experimentalGroup);
        }
        let numbers = nonExperts.length + 1;
        await chatDAO.updateCurrentNumberOfTeams(teamId, streamId, numbers);
      }
    }
    if(nonExpertGroups.length){
      for(let i = 0; i < nonExpertGroups.length; i++){
        let teamId = nonExpertGroups[i].teamId;
        let teamName = nonExpertGroups[i].teamName;
        let nonExperts = nonExpertGroups[i].nonExperts;
        let experimentalGroup = nonExpertGroups[i].experimentalGroup;
        for(let pos = 0; pos < nonExperts.length; pos++){
          await chatDAO.insertUsersInGroups(streamId, teamId, nonExperts[pos], ChatString.NO_EXPERT, teamName, experimentalGroup);
        }
        await chatDAO.updateCurrentNumberOfTeams(teamId, streamId, nonExperts.length);
      }
    }
  }

  module.exports = {createGroups, autoJoinTeams};