var Alexa = require('alexa-sdk'),
moment = require('moment'),
mtz = require('moment-timezone'),
http = require('http');

// app variables
var speechText;
var repromptText;
var cardTitle = "PDX Bus Tracker";
var cardContent;

// App specific configurations
var config = {
    APP_ID : "amzn1.ask.skill.ec8d058d-0c81-4645-88be-f5a5b51c9b31",
    TRIMET_KEY : "C40112249CB0B576572DE9666",
    TIME_ZONE : 'America/Vancouver'
}

exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = config.APP_ID;
    alexa.registerHandlers(newSessionHandlers, handlers, helperHandlers);
    alexa.execute();
};

var newSessionHandlers = {
    /** Catch-All and Entry Point */
    'NewSession': function(){
        speechText = "Welcome, say a stop ID and I will tell you the arrival schedules";
        repromptText = "Sorry, which stop ID do you want arrivals for?";
        this.emit(':ask', speechText, repromptText);
    }
};

var handlers = {

    'LaunchRequest' : function(){
        this.emit('getWelcomeMessage');
    },

    'SessionEndedRequest' : function () {
        speechText = "";
        repromptText = "";
        this.emit(':tell', 'Ok, Goodbye!');
    },

    /** HANDLE GetNextArrivalIntent */
    'GetNextArrivalIntent' : function () {
        var stopIdSlot = this.event.request.intent.slots.item;
        var stopId = stopIdSlot && stopIdSlot.value ? stopIdSlot : 0;

        getNextArrivals(stopId, function(data){

            var jsData = JSON.parse(data);
            var hasArrivals = jsData.resultSet.arrival && jsData.resultSet.arrival.length > 0;
            var hasErrors = jsData.resultSet.error ? true : false;

            if(hasArrivals){
                var location = jsdata.resultSet.location[0];
                var arrivals = jsdata.resultSet.arrival;

                cardText = "Arrivals for " + replaceSpeech(location.desc, "&", "and") + ", " + location.dir + ". "
                
                /** CYCLE THROUGH BUSES AND SCHEDULES */
                arrivals.forEach(function(arr) {
                    cardText += "Bus " + replaceSpeech(arr.shortSign, "TC", "Transit Center") + ", scheduled at " 
                    + mtz(arr.scheduled).tz('America/Vancouver').format("h mm a") + ", estimated arrival " 
                    + timeToArrival(arr.scheduled) + ". ";
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
            this.emit(':tell', cardText);
        });
    },

    'AMAZON.HelpIntent' : function(){
        speechText = 'You can ask for bus schedules at a given stop ID. ' + 
        'For example, two two six six, or you can say stop. ' + 
        'Now, which Stop would you want arrivals for?';

        repromptText = 'I am sorry, I did not understand that. ' + 
        'You can say two two six six, Or you can say stop. ' + 
        'Now, which Stop would you want arrivals for?';

        this.emit(':ask', speechText, repromptText);
    },

    'AMAZON.CancelIntent': function () {
        this.emit('SessionEndedRequest');
    },

    'AMAZON.StopIntent': function () {
        this.emit('SessionEndedRequest');
    },

    'unhandled' : function(){
        speechText = 'Sorry, I didn\'t get that. Try saying a stop ID.';
        this.emit(':ask', speechText, speechText);
    },
};

/** HELPER FUNCTIONS */
var helperHandlers = {
    'getWelcomeMessage' : function(){
        speechText = "Welcome, say a stop ID and I will tell you the arrival schedules";
        repromptText = "Sorry, which stop ID do you want arrivals for?";
        this.emit(':ask', speechText, repromptText);
    },

    /** API CALL TO TRIMET FOR ARRIVALS */
    'getNextArrivals' : function(stopId, callback){
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
        })
    },

    /** LOCALIZE TIME TO TIMEZONE */
    'timeToArrival' : function(scheduledtime){
        var pdxNow = mtz().tz(config.TIME_ZONE);
        var scheduled = mtz(scheduledtime).tz(config.TIME_ZONE);
        return pdxNow.to(scheduled);
    },

    /** FUNCTION TO REPLACE SYMBOLS AND SPECIAL CHARACTERS */
    'replaceSpeech' : function (textVal, searchval, replaceVal) {
        return textVal.replace(searchval, replaceVal);
    },

    /** CREATE API URI */
    'getUrl' : function (stopId){
        return 'http://developer.trimet.org/ws/v2/arrivals?locIDs=' + 
        stopId + '&appID=' + config.TRIMET_KEY;
    }   
};