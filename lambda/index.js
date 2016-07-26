var Alexa = require('alexa-sdk'),
moment = require('moment'),
mtz = require('moment-timezone'),
http = require('http');

// app variables
var speechText;
var repromptText;
var cardTitle = "PDX Bus Tracker";
var cardContent;
var cardText;
var cardHeading;
var noArrivalText;


// App specific configurations
var config = {
    APP_ID : "amzn1.ask.skill.ec8d058d-0c81-4645-88be-f5a5b51c9b31",
    TRIMET_KEY : "C40112249CB0B576572DE9666",
    TIME_ZONE : 'America/Vancouver'
}

exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = config.APP_ID;
    alexa.registerHandlers(trackModeHandlers);
    alexa.execute();
};

var trackModeHandlers = {
    'LaunchRequest': function() {
        speechText = "Welcome to PDX Bus Tracker, I will tell you arrival schedules for bus stops. " + 
        "Say a stop ID and I will tell you the arrival schedules";
        repromptText = "For instructions on what you can say, please say help, or say stop to quit.";
        this.emit(':ask', speechText, repromptText);
    },

    /** HANDLE GetNextArrivalIntent */
    'GetNextArrivalIntent' : function () {

        var myintent = this;
        var stopIdSlot = this.event.request.intent.slots.stopId.value;
        var stopId = stopIdSlot !== null || stopIdSlot !== undefined ? stopIdSlot : 0;
        
        getNextArrivals(stopId, function(data){
            var jsdata = JSON.parse(data);
            var hasArrivals = jsdata.resultSet.arrival && jsdata.resultSet.arrival.length > 0;
            var hasErrors = jsdata.resultSet.error ? true : false;

            if(hasArrivals){
                var location = jsdata.resultSet.location[0];
                var arrivals = jsdata.resultSet.arrival;

                cardText = "Arrivals for " + replaceSpeech(replaceSpeech(location.desc, "&", "and"), "TC", "Transit Center") + ", " 
                + location.dir + ". "

                arrivals.forEach(function(arr) {
                    cardText += "Bus " + replaceSpeech(arr.shortSign, "TC", "Transit Center") + ", scheduled at " 
                    + mtz(arr.scheduled).tz('America/Vancouver').format("h mm a") + ", estimated arrival " 
                    + timeToArrival(arr.scheduled) + ". ";
                });

                cardText += 'Do you want arrivals for another Stop? you can say yes, or say no to quit.';

                repromptText = "If you want arrivals for another stop, please say the ID. " +
                "You can also say stop to exit.";
            }
            else if(hasErrors)
            {
                var errorText = 'The Stop ID you requested is invalid. Please say a valid stop ID!';
                cardText = errorText;
            }else
            {
                var noStopIdText = 'The Stop ID you requested is invalid. Please say a valid stop ID!';
                cardText = noStopIdText;
            }

            myintent.emit(':ask', cardText, repromptText);
        })
    },

    'AMAZON.HelpIntent': function () {
        speechText = 'You can ask for bus schedules at a given stop ID. ' + 
        'For example, two two six six, or you can say stop to quit. ' + 
        'Now, which Stop would you want arrivals for?';

        repromptText = 'I am sorry, I did not understand that. ' + 
        'Say a stop ID, Or you can say stop to quit. ' + 
        'Now, which Stop would you want arrivals for?';

        this.emit(':ask', speechText, repromptText);
    },

    'AMAZON.YesIntent': function() {
        speechText = 'OK!, please say a stop ID for arrivals, or say no to quit';
        this.emit(':ask', speechText, speechText);
    },

    'AMAZON.NoIntent': function() {
        speechText ='Ok, Thank you for using PDX bus tracker, GoodBye!';
        this.emit(':tell', speechText);
    },

    'AMAZON.CancelIntent': function () {
        speechText ='Ok, Thank you for using PDX bus tracker, GoodBye!';
        this.emit(':tell', speechText);
    },

    'AMAZON.StopIntent': function () {
        speechText ='Ok, Thank you for using PDX bus tracker, GoodBye!';
        this.emit(':tell', speechText);
    },

    'SessionEndedRequest' : function () {
        speechText = "";
        repromptText = "";
    },

    'unhandled' : function(){
        speechText = 'Sorry, I didn\'t get that. Try saying a stop ID or say Stop to quit';
        this.emit(':ask', speechText, speechText);
    }
};

/** CALL TRIMET API FOR SCHEDULES */
var getNextArrivals = function (stopId, callback) {
    http.get(getUrl(stopId), function(response){
            var body = '';

            response.on('data', function(data){
                body += data;
            });

            response.on('end', function(){
                callback(body);
            })
    }).on('error', function(e){
            console.log('error: ' + e);
    });
};

/** LOCALIZE TIME TO TIMEZONE */
var timeToArrival =  function (scheduledtime) {
    var pdxNow = mtz().tz(config.TIME_ZONE);
    var scheduled = mtz(scheduledtime).tz(config.TIME_ZONE);
    return pdxNow.to(scheduled);
};

/** FUNCTION TO REPLACE SYMBOLS AND SPECIAL CHARACTERS */
var replaceSpeech = function (textVal, searchval, replaceVal) {
    return textVal.replace(searchval, replaceVal);
}

/** CREATE API URI */
var getUrl = function (stopId) {
     return 'http://developer.trimet.org/ws/v2/arrivals?locIDs=' + stopId + '&appID=' + config.TRIMET_KEY;
}