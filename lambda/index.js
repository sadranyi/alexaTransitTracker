var http = require('http'),
    AlexaSkill = require('./AlexaSkill'),
    APP_ID = 'amzn1.ask.skill.ec8d058d-0c81-4645-88be-f5a5b51c9b31',
    TRIMET_KEY = 'C40112249CB0B576572DE9666',
    express = require('express'),
    moment = require('moment'),
    mtz = require('moment-timezone'),
    util = require('util-is');


var app = express();

var cardText;
var cardHeading;
var noArrivalText;
var speechText;
var repromtText;

var url = function (stopId){
    return 'http://developer.trimet.org/ws/v2/arrivals?locIDs=' + stopId + '&appID=' + TRIMET_KEY;
};

var timeToArrival = function(scheduledtime){
    var pdxNow = mtz().tz('America/Vancouver');
    var scheduled = mtz(scheduledtime).tz('America/Vancouver');

    return pdxNow.to(scheduled);
};

var getArrival = function(stopId, callback){
    http.get(url(stopId), function(res){
        var body = '';

        res.on('data', function(data){
            body += data;
        });

        res.on('end', function(){
            callback(body);
        })
    }).on('error', function(e){
        console.log('Error: ' + e)
    })
};

var replaceSpeech = function(textVal, searchval, replaceVal){
    return textVal.replace(searchval, replaceVal);
}

/** LOCAL DEBUG
 * COMMENT BEFORE DEPLOY

var myCallback = function(data){

    var jsdata = JSON.parse(data);
    var hasArrivals = jsdata.resultSet.arrival && jsdata.resultSet.arrival.length > 0;
    var hasErrors = jsdata.resultSet.error ? true : false;

    if(hasArrivals){
        var location = jsdata.resultSet.location[0];
        var arrivals = jsdata.resultSet.arrival;

        console.log("Arrivals for " + location.desc + ", " + location.dir + ".");
        arrivals.forEach(function(arr) {
            console.log("Bus " + arr.shortSign + ", scheduled " + moment(arr.scheduled).calendar(arr.scheduled) + ", estimated arrival " + timeToArrival(arr.scheduled) + ".");
        });
    }
    else if(hasErrors){
        console.log(jsdata.resultSet.error.content);
    }
    else{
        console.log("the stop ID you requested is invalid. Please say a valid stop ID!");
    }
};
*/

var handleNexArrivalRequest = function(intent, session, response){
    getArrival(intent.slots.stopId.value, function(data){

        var jsdata = JSON.parse(data);
        var hasArrivals = jsdata.resultSet.arrival && jsdata.resultSet.arrival.length > 0;
        var hasErrors = jsdata.resultSet.error ? true : false;

        if(hasArrivals){
            var location = jsdata.resultSet.location[0];
            var arrivals = jsdata.resultSet.arrival;

            cardText = "Arrivals for " + replaceSpeech(location.desc, "&", "and") + ", " + location.dir + ". "
            arrivals.forEach(function(arr) {
                cardText += "Bus " + replaceSpeech(arr.shortSign, "TC", "Transit Center") + ", scheduled at " + mtz(arr.scheduled).tz('America/Vancouver').format("h mm a") + ", estimated arrival " + timeToArrival(arr.scheduled) + ". ";
            });
        }
        else if(hasErrors){
            errorText = 'The Stop ID you requested is invalid. Please say a valid stop ID!';
            cardText = errorText;
        }
        else{
            noStopIdText = 'The Stop ID you requested is invalid. Please say a valid stop ID!';
            cardText = noStopIdText;
        }

        cardHeading = 'Next arrival for stop ID: ' + intent.slots.stopId.value;
        response.tellWithCard(cardText, cardHeading, cardText);
    })
};

var ArrivalSchedule = function(){
    AlexaSkill.call(this,APP_ID);
};

ArrivalSchedule.prototype = Object.create(AlexaSkill.prototype);
ArrivalSchedule.prototype.constructor = ArrivalSchedule;

/** EVENTS */
ArrivalSchedule.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("PDX Bus Tracker onSessionStarted requestId: " + sessionStartedRequest.requestId + ", sessionId: " + session.sessionId);
};

ArrivalSchedule.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("PDX Bus Tracker onSessionEnded requestId: " + sessionEndedRequest.requestId + ", sessionId: " + session.sessionId);
};

ArrivalSchedule.prototype.eventHandlers.onLaunch = function(launchRequest, session, response){
    console.log("PDX Bus Tracker onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    getWelcomeMessage(response);
};

ArrivalSchedule.prototype.intentHandlers = {
    GetNextArrivalIntent: function (intent, session, response) {
        handleNexArrivalRequest(intent, session, response);
    },

    "AMAZON.HelpIntent": function(intent, session, response){
        var speechOutText = "You can ask for bus arrivals and schedules at a given stop ID. " + 
        "For example, two two six six, or you can say exit. " + 
        "Now, which Stop would you want arrivals for?";

        var repromtOutText = "I am sorry I did not understand that. " + 
        "You can say two two six six, Or you can say exit. " + 
        "Now, which Stop would you want arrivals for?"

        response.ask(speechOutText, repromtOutText);
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = "Goodbye";
        response.tell(speechOutput);
    }
};

var getWelcomeMessage = function (response) {
    speechText = 'Welcome to Trimet Transit Tracker. ' +
    'Say a stop ID and I will tell you the arrival times.';

    repromtText = 'Which stop ID do you want arrival times for ?';
    response.ask(outputText, repromtText);
}

exports.handler = function(event, context){
    var skill = new ArrivalSchedule();
    skill.execute(event, context);
};

/** LOCAL DEBUB 
 *  REMOVE BEFORE DEPLOYMENT 
app.get('/alexa', function(req, res){
    console.log("We are game");
    res.end('welcome to Trimet Transit Tracker on Alexa');
    getArrival(2, myCallback);
});

var server = app.listen(9290, function(){
    console.log("Test Server running @ 9290");
});
*/