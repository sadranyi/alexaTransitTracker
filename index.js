var http = require('http'),
    AlexaSkill = require('./AlexaSkill'),
    APP_ID = 'amzn1.ask.skill.ec8d058d-0c81-4645-88be-f5a5b51c9b31',
    TRIMET_KEY = 'C40112249CB0B576572DE9666',
    xml2js = require('xml2js'),
    express = require('express');

var app = express();

var url = function (stopId){
    return 'http://developer.trimet.org/ws/V1/arrivals?locIDs=' + stopId + '&appID=' + TRIMET_KEY;
}

var getJson = function(xmlResult){
    var parser = new xml2js.Parser();
    parser.parseString(xmlResult, function(err, res){
        console.log(JSON.stringify(res));
    });
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
    getJson(data);
}

var handleNexArrivalRequest = function(intent, session, response){
    getArrival(intent.slots.stopId.value, function(data){
        //Convert Data to JSON
        var parser = new xml2js.Parser();
        parser.parseString(data, function(err, res){
            var jsonData = JSON.stringify(res);
        });
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