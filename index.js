var http = require('http'),
    AlexaSkill = require('./AlexaSkill'),
    APP_ID = 'amzn1.ask.skill.ec8d058d-0c81-4645-88be-f5a5b51c9b31',
    TRIMET_KEY = 'C40112249CB0B576572DE9666';

var url = function (stopId){
    return 'https://developer.trimet.org/ws/V1/arrivals?locIDs=' + stopId + '&appID=' + TRIMET_KEY;
}