const { TableName, TeamContext } = require('./../../share/enumerations');


module.exports = r => ({
    async insertChatMessage(msg) {
        try {
            await r.table(TableName.CHAT_MESSAGES).insert(msg).run();
        } catch (error) {
            throw error;
        }
        return true;
    },

    async getTeamMessagesByTeamId(teamId){
        try {
            return await r.table(TableName.CHAT_MESSAGES).filter(r.row('teamId').eq(teamId)).orderBy('messageTime');
        } catch (error) {
            throw error;
        }
    },

    async getTitleOfMaterial(materialId){
        try {
            return await r.table(TableName.COURSE_MATERIAL).get(materialId)('title');
        } catch (error) {
            throw error;
        }
    },

    async getAllMaterialsOfCourse(courseId){
        try {
            return await r.table(TableName.COURSES).get(courseId)('courseMaterials');
        } catch (error) {
            throw error;
        }
    },

    async getMaterial(materialId){
        try {
            return await r.table(TableName.COURSE_MATERIAL).get(materialId)('courseMaterials');
        } catch (error) {
            throw error;
        }
    },

    async getUnit(unitId){
        try {
            return await r.table(TableName.UNITS).get(unitId);
        } catch (error) {
            throw error;
        }
    },

    async getInteraction(id){
        try {
            return await r.table(TableName.INTERACTIONS).get(id);
        } catch (error) {
            throw error;
        }
    },

    async getExecution(id){
        try {
            return await r.table(TableName.EXECUTIONS).get(id);
        } catch (error) {
            throw error;
        }
    },

    async insertScores(scores){
        let insertId;
        if(!scores){
            throw ('there is no data needed to be inserted into db');
        }
        scores.createdAt = Date.now();
        try { 
            let result = await r.table(TableName.CHAT_SCORES).insert(
                scores, 
                {conflict: 'replace'}
            );
            insertId = result.generated_keys;
        } catch (error) {
            throw error;
        }
        return insertId[0];
    },

    async getTeamsByStreamId(streamId) {
        let context = {
            contextType: TeamContext.STREAM,
            contextId: streamId
        };
        try {
            return await r.table(TableName.TEAMS).filter({context});
        } catch (error) {
            throw error;   
        }
    },
    
    async insertGroups(streamId, unitId, scoresId, groups){
        let insertId;
        if(!groups){
            throw ('there is no groups');
        }
        try{
            await r.table(TableName.CHAT_GROUPS).filter(r.row('scoresId').eq(scoresId)).delete();
            let result = await r.table(TableName.CHAT_GROUPS).insert({
                streamId,
                unitId,
                scoresId,
                groups,
                createdAt: Date.now(),
                }
            );
            insertId = result.generated_keys;
        }catch(error){
            throw error;
        }
        return insertId[0];
    },

    async getTeamByUserId(userId, streamId){
        try{
            let result = await r.table(TableName.CHAT_USERS).filter(
                r.row('userId').eq(userId).and(
                    r.row('streamId').eq(streamId))).orderBy(r.desc('createdAt'));
            return result;
            
        }catch(error){
            throw error;
        }
    },

    async getMembersByTeamId(teamId){
        try {
            let result = await r.table(TableName.CHAT_USERS).filter(
                r.row('teamId').eq(teamId));
            let userNames=[];
            for(let i = 0; i < result.length; i++){
                let userId = result[i].userId;
                let userName = await r.table(TableName.USERS).get(userId)('username');
                userNames.push({userId, userName});
            }
            return userNames.sort((a , b) => {
                return a.userName > b.userName;
            });
        } catch (error) {
            throw error;
        }
    },

    async updateCurrentNumberOfTeams(teamId, streamId, number){
        try {
            let context = {
                contextType: TeamContext.STREAM,
                contextId: streamId
            };
            await r.table(TableName.TEAMS).filter(
                r.row('context').eq(context).and(r.row('id').eq(teamId))).
                update({numberOfMembers:number});
        }catch(error){
            throw error;
        }
    },

    async insertUsersInGroups(streamId, teamId, userId, expertRole, teamName, experimentalGroup){
      try{
          await r.table(TableName.CHAT_USERS).insert({
              streamId,
              teamId,
              userId,
              expertRole,
              teamName,
              experimentalGroup,
              createdAt: Date.now()
          });
      }catch(error){
          throw error;
      }
    },

    async setNumberOfMembersZero(streamId){
        let context = {
            contextId: streamId,
            contextType: TeamContext.STREAM,
        };
        try{
            await r.table(TableName.TEAMS).filter(r.row('context').eq(context)).update({numberOfMembers:0});
        }catch(error){
            throw error;
        }
    },

    async deleteChatUsers(streamId){
        try {
            await r.table(TableName.CHAT_USERS).filter(r.row('streamId').eq(streamId)).delete();
        } catch (error) {
            throw error;
        }
    },

    async deleteChatMessages(streamId){
        try{
            await r.table(TableName.CHAT_MESSAGES).filter(r.row('streamId').eq(streamId)).delete();
        }catch(error){
            throw error;
        }
    },

    async deleteChatGroups(streamId){
        try{
            await r.table(TableName.CHAT_GROUPS).filter(r.row('streamId').eq(streamId)).delete();
        }catch(error){
            throw error;
        }
    },

    async deleteChatScores(streamId){
        try{
            let scoresId = await r.table(TableName.CHAT_GROUPS).filter(r.row('streamId').eq(streamId))('scoresId');
            await r.table(TableName.CHAT_SCORES).filter(r.row('id').eq(scoresId[0])).delete();
        }catch(error){
            throw error;
        }
    },

    async getStreamIdByUnitId(unitId){
        try {
            let stream = await r.table(TableName.STREAMS).filter({context:{unitId}});
            let streamId = stream[0].id;
            return streamId;
        } catch (error) {
            throw error;
        }
    },

    async getScores(materialId){
        try {
            let results = await r.table(TableName.CHAT_SCORES).filter(r.row('materialsId').eq(materialId)).orderBy(r.desc('createdAt'));
            let finalScores = results[0].data.finalScores;
            let scores = {};
            for(let index = 0; index < finalScores.length; index++){
                let item = finalScores[index];
                scores[item.userId] = item.score;
            }
            return scores;

        } catch (error) {
            throw error;
        }
    }

});