var http = require('http'),
    AlexaSkill = require('./AlexaSkill'),
    APP_ID = 'amzn1.ask.skill.ec8d058d-0c81-4645-88be-f5a5b51c9b31',
    TRIMET_KEY = 'C40112249CB0B576572DE9666',
    express = require('express'),
    moment = require('moment'),
    mtz = require('moment-timezone');


var app = express();

var cardText;
var cardHeading;
var noArrivalText;

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
    var hasArrivals = jsdata.resultSet.arrival.length;
    
    if(hasArrivals > 0){
        var location = jsdata.resultSet.location[0];
        var arrivals = jsdata.resultSet.arrival;

        console.log("Arrivals for " + location.desc + ", " + location.dir + ".");
        arrivals.forEach(function(arr) {
            console.log("Bus " + arr.shortSign + ", scheduled " + moment(arr.scheduled).calendar(arr.scheduled) + ", estimated arrival " + timeToArrival(arr.scheduled) + ".");
        });
    }
};
 */

var handleNexArrivalRequest = function(intent, session, response){
    getArrival(intent.slots.stopId.value, function(data){

        var jsdata = JSON.parse(data);
        var hasArrivals = jsdata.resultSet.arrival.length;

        if(hasArrivals > 0){
            var location = jsdata.resultSet.location[0];
            var arrivals = jsdata.resultSet.arrival;

            cardText = "Arrivals for " + replaceSpeech(location.desc, "&", "and") + ", " + location.dir + ". "
            arrivals.forEach(function(arr) {
                cardText += "Bus " + replaceSpeech(arr.shortSign, "TC", "Transit Center") + ", scheduled at " + mtz(arr.scheduled).tz('America/Vancouver').format("h mm a") + ", estimated arrival " + timeToArrival(arr.scheduled) + ". ";
            });
            
        }
        else
        {
            noArrivalText = 'No arrivals for stop: ' + intent.slots.stopId.value;
            cardText = text;
        }

        cardHeading = 'Next arrival for stop ID: ' + intent.slots.stopId.value;
        response.tellWithCard(cardText, cardHeading, cardText);
    })
};

var ArrivalSchedule = function(){
    AlexaSkill.call(this,APP_ID);
};

ArrivalSchedule.prototype = Object.create(AlexaSkill.prototype);
ArrivalSchedule.prototype.constructor =ArrivalSchedule;

/** EVENTS */
ArrivalSchedule.prototype.eventHandlers.onLaunch = function(launchRequest, session, response){
    var outputText = 'Welcome to Trimet Transit Tracker. ' +
    'Say a stop ID and i will tell you the arrival times.';

    var repromtText = 'Which stop ID do you want arrival times for ?';
    response.ask(outputText, repromtText);
};

ArrivalSchedule.prototype.intentHandlers = {
    GetNextArrivalIntent: function (intent, session, response) {
        handleNexArrivalRequest(intent, session, response);
    },

    HelpIntent: function(intent, session, response){
        var speachOutput = "Get the Next arrivals for Trimet Stop ID. " + 
        "Which Stop would you want arrivals for?";
        response.ask(speachOutput);
    }
};

exports.handler = function(event, context){
    var skill = new ArrivalSchedule();
    skill.execute(event, context);
};

/** LOCAL DEBUB 
 *  REMOVE BEFORE DEPLOYMENT 
 
app.get('/alexa', function(req, res){
    console.log("We are game");
    res.end('welcome to Trimet Transit Tracker on Alexa');
    getArrival(2276, myCallback);
});

var server = app.listen(9290, function(){
    console.log("Test Server running .....");
});
*/