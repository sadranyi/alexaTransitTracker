var http = require('http'),
    AlexaSkill = require('./AlexaSkill'),
    APP_ID = 'amzn1.ask.skill.ec8d058d-0c81-4645-88be-f5a5b51c9b31',
    TRIMET_KEY = 'C40112249CB0B576572DE9666',
    express = require('express'),
    moment = require('moment');

var app = express();
var cardText;

var url = function (stopId){
    return 'http://developer.trimet.org/ws/v2/arrivals?locIDs=' + stopId + '&appID=' + TRIMET_KEY;
}

var timeToArrival = function(scheduledtime){
    var now = moment();
    var scheduled = moment(scheduledtime);

    return now.to(scheduled);
}

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
}

var myCallback = function(data){
    var jsdata = JSON.parse(data);
    var hasArrivals = jsdata.resultSet.arrival.length;
    
    if(hasArrivals > 0){
        var location = jsdata.resultSet.location[0];
        var arrivals = jsdata.resultSet.arrival;

        console.log("Arrivals for " + location.desc + ".");
        arrivals.forEach(function(arr) {
            console.log("Bus " + arr.shortSign + " scheduled " + moment(arr.scheduled).calendar(arr.scheduled) + ", estimated arrival " + timeToArrival(arr.scheduled) + ".");
        });
    }
}

var handleNexArrivalRequest = function(intent, session, response){
    getArrival(intent.slots.stopId.value, function(data){

        var jsdata = JSON.parse(data);
        var hasArrivals = jsdata.resultSet.arrival.length;

        if(hasArrivals > 0){
            var location = jsdata.resultSet.location[0];
            var arrivals = jsdata.resultSet.arrival;

            cardText = "Arrivals for " + location.desc + "."

            console.log("Arrivals for " + location.desc + ".");

            arrivals.forEach(function(arr) {
                console.log("Bus " + arr.shortSign + " scheduled " + moment(arr.scheduled).calendar(arr.scheduled) + ", estimated arrival " + timeToArrival(arr.scheduled) + ".");
            });
        }
        else
        {
            var text = 'No arrivals for stop: ' + intent.slots.stopId.value;
            cardText = text;

        }
    })
}


// DEBUB CODE REMOVE BEFORE DEPLOYMENT
app.get('/alexa', function(req, res){
    console.log("We are game");
    res.end('welcome to Trimet Transit Tracker on Alexa');
    getArrival(2276, myCallback);
});

var server = app.listen(9290, function(){
    console.log("Test Server running .....");
})