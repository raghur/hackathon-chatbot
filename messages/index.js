/*-----------------------------------------------------------------------------
This template demonstrates how to use an IntentDialog with a LuisRecognizer to add 
natural language support to a bot. 
For a complete walkthrough of creating this type of bot see the article at
http://docs.botframework.com/builder/node/guides/understanding-natural-language/
-----------------------------------------------------------------------------*/
"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
require("./utils");

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);

// Make sure you add code to validate these fields
var luisAppId = process.env.LuisAppId || "3b2e83ce-05c6-491b-baba-7de5f202d097";
var luisAPIKey = process.env.LuisAPIKey || "f3856e3a20924fb588811690a12f6eae";
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v2.0/apps/' + luisAppId + '?subscription-key=' + luisAPIKey;
console.log(LuisModelUrl);
//https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/747a7f6f-9583-4fbe-96e8-b807b4691bb9?subscription-key=7da8cb8d6bad41648643ac65735f3e17&verbose=true&q=
// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] })
bot.dialog('/', intents);    
/*
.matches('<yourIntent>')... See details at http://docs.botframework.com/builder/node/guides/understanding-natural-language/
*/
intents.matches('Help', (session, args)=> {
    session.send(`Hello! I'm a bot and I can help with finding orders and updating order statuses. Try asking me 
    
How many orders are on hold?
    
How many orders were shipped today?`);
    console.log(JSON.stringifyOnce(args, null, 2));
})
.matches('OrderQuery', 
    [
       (session, args, next) => {
           console.log(JSON.stringifyOnce(args, null, 2));
           var orderstatus = builder.EntityRecognizer.findEntity(args.entities, "orderstatus");
           console.log(orderstatus);
           if (!orderstatus) {
               builder.Prompts.choice(session, "Sure - what type of orders?", ["On Hold", "Shipped"]);
           } else {
               if (orderstatus.entity == "hold") {
                   session.send("going to find orders by hold status.");
                   session.beginDialog("/OnHoldOrders");
               } else if(orderstatus.entity == "shipped") {
                   session.send("going to find orders by status shipped");
               }
           }
        },
        (session, args, next) => {
            console.log("results: ", JSON.stringifyOnce(args));
           session.send("So you want to find orders by status: %s", args.response.entity);
           if (args.response.entity == 'On Hold')
               session.beginDialog("/OnHoldOrders");
        }
    ]
)
.matches('None', (session, args) => {
    session.send('Hi! This is the None intent handler. You said: \'%s\'.', session.message.text);
})
.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'.', session.message.text);
});

bot.dialog("/OnHoldOrders", [
    (session) => {
       // fire sql query and return data here. 
       console.log("in OnHoldOrders dialog")
       session.send ("here are your OnHold orders: ")
       builder.Prompts.confirm(session, "Would you like to release orders?");
    },
    (session, args) => {
        console.log("results: ", JSON.stringifyOnce(args));
        if (args.response) {
            builder.Prompts.choice(session, "Would you like to release all orders or selective orders?",
                        ["All", "Selective"]);
        }
    },
    (session, args) => {
        console.log("results: ", JSON.stringifyOnce(args));
        if (args.response.entity == "Selective") {
            console.log("releasing selective orders");
        } else if (args.response.entity == "All") {
            console.log("releasing all orders");
        }
    }
]);

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
}

