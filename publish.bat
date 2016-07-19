del index.zip 
cd lambda 
7z a ../index.zip * 
cd .. 
aws lambda update-function-code --function-name alexaTransitTracker --zip-file fileb://index.zip