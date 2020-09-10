//db table course stores the info of materials, e.g. Pre-test, Quiz-1.
//da table course_material stores the info of units, e.g. knowledge-evaluation unit 
//db table units stores the info contents e.g. quizzes, and interactions
//db table interactions stores the info executions
//db table execution stores the answer results
//get the courseId from the client; Use the courseId get the courseMaterialsId.
//use the courseMaterialsId get the unitId; use the unitId get the contentId and interactionId;
//use interactionId get the executionId
//access the answer results from the db execution
const _ =require('lodash');
var scoresItem;
const {ChatString} = require('./../../../share/enumerations');

module.exports = async (chatDAO, courseId, courseMaterialsId) => {
    const experimentMaterialsNameOrder=[ChatString.FIRST, ChatString.SECOND, ChatString.THIRD, ChatString.FOURTH, ChatString.LAST];
    const experimentMaterialsIdOrder=['','','','',''];  

    scoresItem={
        data:{}};
    
    let resultsIds={
        expertsIds:[],
        nonExpertsIds:[],
    };
    let ifPreTest;

    //get all courseMaterialIds  
    let courseMaterials = await chatDAO.getAllMaterialsOfCourse(courseId);
    for(let index = 0; index < courseMaterials.length; index++){
        let title = await chatDAO.getTitleOfMaterial(courseMaterials[index]);
        let posIndex = experimentMaterialsNameOrder.indexOf(title);
        experimentMaterialsIdOrder[posIndex] = courseMaterials[index];
    }
    //get the index of current title in in experimentMaterialsNameOrder
    let currentMaterialTitle = await chatDAO.getTitleOfMaterial(courseMaterialsId);
    let positionOfNameOrder = experimentMaterialsNameOrder.indexOf(currentMaterialTitle);
    
    if(positionOfNameOrder < 0){
        console.log('there is no such course material:', courseMaterialsId);
        return resultsIds;
    }
    if(positionOfNameOrder === 0){
        return resultsIds;
    }

    //get all data of the unit of last material. Default there is only one unit in one material
    //The edgesData are the order of all contents in this material. 
    //interactionMappings contain the interactionId for each unit 
    let previousIndex = positionOfNameOrder-1;
    scoresItem.materialsId=experimentMaterialsIdOrder[previousIndex];
    scoresItem.materialsName = experimentMaterialsNameOrder[previousIndex];

    let {previousData, previousUnitId} = await getPreviousMaterialData(previousIndex,experimentMaterialsIdOrder,chatDAO);
    let edgesData = previousData.data.edges;
    let interactionMappings = previousData.data.interactionMappings;
    let contentIdOrder = [];
    if(edgesData.length){
        contentIdOrder = createContentIdOrder(edgesData).slice();
    }
    
    //when positionOfNameOrder is 1, the previous unit is Pre-test, then the initialScore is calculated and it is in the warm up stage.
    //Otherwise the adaptive score is calculated.
    let finalScores;
    if(positionOfNameOrder === 1){
        ifPreTest = true;
        finalScores = await calculateInitialScore(contentIdOrder, interactionMappings, chatDAO);
    }else{
        let accumulateMaterialId = experimentMaterialsIdOrder[previousIndex - 1];
        ifPreTest = false;
        finalScores = await calculateScore(contentIdOrder, interactionMappings, previousUnitId, accumulateMaterialId, chatDAO);
    }
    
    if(finalScores != undefined){
        finalScores.sort((first, second) => second.score - first.score);
    }
    let membersOfEachTeam = 3;
    let numberOfExperts = Math.floor(finalScores.length /membersOfEachTeam);
    for(let i = 0; i < numberOfExperts; i++){
        resultsIds.expertsIds.push(finalScores[i].userId);
    }
    for(let i = numberOfExperts; i < finalScores.length; i++){
        resultsIds.nonExpertsIds.push(finalScores[i].userId);
    }

    scoresItem.data.finalScores = finalScores;
    scoresItem.resultsIds = resultsIds;
    let insertScoresId = await chatDAO.insertScores(scoresItem);
    return {
        ifPreTest,
        insertScoresId,
        resultsIds};
};

async function getPreviousMaterialData(positionOfNameOrder, experimentMaterialsIdOrder, chatDAO, unitIndex = 0){
    let previousMaterialId = experimentMaterialsIdOrder[positionOfNameOrder];
    let previousMaterial = await chatDAO.getMaterial(previousMaterialId);
    let previousUnitId = previousMaterial[unitIndex].unitId;
    let previousVersionId = previousMaterial[unitIndex].versionId;
    let previousUnit = await chatDAO.getUnit(previousUnitId);
    let previousData = previousUnit.olderVersions.filter(item => item.id === previousVersionId)[0];
    scoresItem.unitId = previousUnitId;
    scoresItem.unit_versionId = previousVersionId;
    return {previousData, previousUnitId};
}

function createContentIdOrder(edgesData){
   let contentIdOrder = [];
   for(let index = 0; index < edgesData.length; index++){
       let next = edgesData[index].next;
       let prev = edgesData[index].prev;
       let prevIndex = contentIdOrder.indexOf(prev);
       let nextIndex = contentIdOrder.indexOf(next);
       if(prevIndex < 0 && nextIndex < 0){
           contentIdOrder.push(prev);
           contentIdOrder.push(next);
       }
       if(prevIndex > 0 && nextIndex < 0){
           contentIdOrder.splice(prevIndex+1,0,next);
       }
       if(nextIndex > 0 && prevIndex < 0){
           contentIdOrder.splice(nextIndex,0,prev);
       }
   }
   return contentIdOrder;
}

async function calculateInitialScore(contentIdOrder, interactionMappings,chatDAO){
    let interactionOrderId = [];
    let currentInteractionId;

    if(contentIdOrder.length){
       for(let index = 0; index < contentIdOrder.length; index++){
        let currentContentId = contentIdOrder[index];
        currentInteractionId = interactionMappings.filter(item => item.contentId === currentContentId)[0].interactionId;
        interactionOrderId.push(currentInteractionId);
        } 
    }else{
        interactionOrderId.push(interactionMappings[0].interactionId);
    }
    let scoreOfSelfEvaluation = await calculateInitialEvaluation(interactionOrderId[0],chatDAO, 'selfEvaluation');
    let finalResult = [];
    for(let key in scoreOfSelfEvaluation){
        let userId = key;
        let score = scoreOfSelfEvaluation[key];
        finalResult.push({userId,score});
    }
    return finalResult;
}

async function calculateScore(contentIdOrder, interactionMappings, unitId, materialId, chatDAO){
    let interactionOrderId = [];
    let currentInteractionId;

    if(contentIdOrder.length){
       for(let index = 0; index < contentIdOrder.length; index++){
        let currentContentId = contentIdOrder[index];
        currentInteractionId = interactionMappings.filter(item => item.contentId === currentContentId)[0].interactionId;
        interactionOrderId.push(currentInteractionId);
        } 
    }else{
        interactionOrderId.push(interactionMappings[0].interactionId);
    }
    let scoreOfQuiz = await calculateQuizResults(interactionOrderId[0],chatDAO);
    let scoreOfSelfEvaluation={};
    let scoreOfRecognition={};

    if(contentIdOrder.length === 3){
        let scoreOfSelfEvaluation1 = await calculateAdaptiveSelfEvaluation(interactionOrderId[1], chatDAO, 'selfEvaluation1');
        let scoreOfSelfEvaluation2 = await calculateAdaptiveSelfEvaluation(interactionOrderId[2], chatDAO, 'selfEvaluation2');
        scoreOfRecognition = await calculateRecognitionScore(scoreOfSelfEvaluation1, scoreOfSelfEvaluation2, unitId, chatDAO);
        _.mergeWith(scoreOfSelfEvaluation, scoreOfSelfEvaluation1, averageScores);
        _.mergeWith(scoreOfSelfEvaluation, scoreOfSelfEvaluation2, averageScores);
        scoresItem.data['selfEvaluation'] = scoreOfSelfEvaluation;
    }

    let adaptiveScores = await calculateAdaptiveScore(scoreOfQuiz, scoreOfSelfEvaluation, scoreOfRecognition, materialId, chatDAO);

    let finalResult = [];
    for(let key in adaptiveScores){
        let userId = key;
        let score = adaptiveScores[key];
        finalResult.push({userId,score});
    }
    return finalResult;
}

async function calculateAdaptiveScore(scoreOfQuiz, scoreOfSelfEvaluation, scoreOfRecognition, materialId, chatDAO){
    let result = {};
    _.mergeWith(result, scoreOfQuiz, sumOfScores);
    _.mergeWith(result, scoreOfSelfEvaluation, sumOfScores);
    _.mergeWith(result, scoreOfRecognition, sumOfScores);
    for(let key in result){
        result[key] = result[key]/3;
    }
    scoresItem.data['performance'] = result;
    let accumulateScores = await chatDAO.getScores(materialId);
    scoresItem.data['accumulation'] = accumulateScores;
    let finalResult = {};
    _.mergeWith(finalResult,result,sumOfScores);
    _.mergeWith(finalResult,accumulateScores, (objValue, srcValue) => {
        if(objValue === undefined){
            return srcValue;
        }
        if(srcValue === undefined){
            return objValue;
        }
        return objValue*0.7+srcValue*0.3;
    });
    return finalResult;
}

async function calculateInitialEvaluation(interactionId, chatDAO, key){
    let interaction = await chatDAO.getInteraction(interactionId);
    let answerOptions = interaction.data.answerOptions;
    let responses = await getUserResponses(interaction, chatDAO);
    let selfEvaluationScores = {};
    for(let index = 0; index < responses.length; index++){
        let userId = responses[index].userId;
        let userChoicesId = responses[index].userChoices;
        let userScore = calculateEvaluationAnswerScore(userId, answerOptions, userChoicesId[0]);
        selfEvaluationScores[userId] = userScore;
    }
    scoresItem.data[key]=selfEvaluationScores;
    return selfEvaluationScores;
}

async function calculateAdaptiveSelfEvaluation(interactionId, chatDAO, key){
    let interaction = await chatDAO.getInteraction(interactionId);
    let answerOptions = interaction.data.answerOptions;
    let responses = await getUserResponses(interaction, chatDAO);
    let selfEvaluationScores = {};

    for(let index = 0; index < responses.length; index++){
        let userId = responses[index].userId;
        let userChoicesId = responses[index].userChoices;
        let userScore = calculateEvaluationAnswerScore(userId, answerOptions, userChoicesId[0]);
        selfEvaluationScores[userId] = userScore;
    }

    scoresItem.data[key]=selfEvaluationScores;
    return selfEvaluationScores;
}

async function calculateRecognitionScore(scoreOfSelfEvaluation1, scoreOfSelfEvaluation2, unitId, chatDAO){
    let result = {};
    let tempResult = {};    
    for(let key in scoreOfSelfEvaluation1){
        let userId = key;
        let streamId = await chatDAO.getStreamIdByUnitId(unitId);
        let team = await chatDAO.getTeamByUserId(userId, streamId);
        let teamId = team[0].teamId;
        let members = await chatDAO.getMembersByTeamId(teamId);
        let otherMembers = members.filter((item) => {
            if(item.userId != userId){
                return item;
            }
        });
        
        if(otherMembers.length != 2){
            scoresItem.data['recognitionScores'] = result;
            return result;
        }

        let member1 = otherMembers[0].userId;
        let score1 = 0;
        if(scoreOfSelfEvaluation1[key]){
            score1 = 1 - scoreOfSelfEvaluation1[key];
        }
        tempResult[member1] = score1;
        let member2 = otherMembers[1].userId;
        let score2 = 0;
        if(scoreOfSelfEvaluation2[key]){
            score2 = 1 - scoreOfSelfEvaluation2[key];
        }
        tempResult[member2] = score2;
        _.mergeWith(result, tempResult, sumOfScores);
        tempResult = {};
    }
    for(let key in result){
        result[key] = result[key]/2;
    }
    scoresItem.data['recognitionScores']=result;
    return result;
}

function calculateEvaluationAnswerScore(userId,answerOptions, userChoicesId){
    let answer = answerOptions.filter(item => item.id === userChoicesId)[0];
    if(answer){
        switch(answer.answerText.trim()){
            case ChatString.VERY_POOR: 
            case ChatString.MUCH_WORSE: return minmaxNormalization(0,0,4);
            case ChatString.BELOW_AVERAGE: 
            case ChatString.SOME_WORSE:return minmaxNormalization(1,0,4);
            case ChatString.AVERAGE:
            case ChatString.SAME: return minmaxNormalization(2,0,4);
            case ChatString.ABOVE_AVERAGE:
            case ChatString.SOME_BETTER: return minmaxNormalization(3,0,4);
            case ChatString.EXCELLENT:
            case ChatString.MUCH_BETTER: return minmaxNormalization(4,0,4);
            default: return 0;
        }
    }
    return 0;
    
}

function minmaxNormalization(value,min,max){
    let result= (value-min)/(max-min);
    return result;
}

async function calculateQuizResults(interactionId, chatDAO){
    let interaction = await chatDAO.getInteraction(interactionId);
    let responses = await getUserResponses(interaction, chatDAO);
    let quizScores = {};
    for(let index = 0; index < responses.length; index++){
        let userId = responses[index].userId;
        let isCorrectAnswer = responses[index].isCorrectAnswer;
        let userScore = isCorrectAnswer? 1: 0;
        quizScores[userId]=userScore;
    }
    scoresItem.data['quiz']=quizScores;
    return quizScores;
}

async function getUserResponses(interaction, chatDAO){
    let lastExecutionIds = interaction.executionIds[interaction.executionIds.length - 1];
    let execution = await chatDAO.getExecution(lastExecutionIds);
    let responses = execution.responses;
    return responses;
}

function sumOfScores(objValue, srcValue){
    if(objValue === undefined){
        return srcValue;
    }
    if(srcValue === undefined){
        return objValue;
    }
    return objValue+srcValue;
}

function averageScores(objValue, srcValue){
    if(objValue === undefined){
        return srcValue;
    }
    if(srcValue === undefined){
        return objValue;
    }
    return (objValue+srcValue)/2;
}


