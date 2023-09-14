require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const jwt = require('jsonwebtoken');
const app = express();

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const port = parseInt(process.env.PORT) || 3030;
const logMessages = [];

let authId, authRequestToken, authUserId, authUrl;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//////////////////////////////////////////////
function getUTCDateTime() {
  const utcTime = new Date().toISOString().slice(0, -1); // remove last character
  return utcTime + " UTC";
}

function appendLog(logMessage) {
  logMessages.unshift(logMessage);
  console.log(logMessage);
}

function parseJwt(tokenString) {
  try {
    // Decode the JWT token (without verifying the signature)
    const decodedToken = jwt.decode(tokenString, { complete: true });

    if (!decodedToken) {
      console.error('Failed to decode the token.');
      return null;
    }

    // Print the decoded token header and payload
    console.log('Decoded Token Header:');
    console.log(decodedToken.header);
    console.log('Decoded Token Payload:');
    console.log(decodedToken.payload);

    return decodedToken;
  } catch (error) {
    console.error('An error occurred:', error.message);
    return null;
  }
}

//////////////////////////////////////////////
// REDIRECT TO LANDING PAGE
app.get("/", (req, res) => {
  res.redirect("/connect");
});

//////////////////////////////////////////////
// GET LANDING PAGE
app.get("/connect", (req, res) => {
  authId = req.query.id;
  authRequestToken = req.query.requestToken;
  authUserId = req.query.userId;

  const serverAddress = req.hostname;
  const queryUrl = req.url.split('?')[0];

  appendLog(`${getUTCDateTime()} >>> Load the landing page.`);
  appendLog(`${getUTCDateTime()} >>> Server Address=${serverAddress}`);
  appendLog(`${getUTCDateTime()} >>> Query endpoint=${queryUrl}`);


  appendLog(`${getUTCDateTime()} >>> Query Parameters:`);
  appendLog(`${getUTCDateTime()} >>> id=${authId}`);
  appendLog(`${getUTCDateTime()} >>> requestToken=${authRequestToken}`);
  appendLog(`${getUTCDateTime()} >>> userId=${authUserId}`);

  res.render("connect");
});

//////////////////////////////////////////////
// AUTHORIZE THE TOKEN REQUEST
app.post("/auth", async (req, res) => {

  // Get the "account-id" and "auth-code" from the request body
  const { 'account-id': accountId, 'auth-code': accountAuthCode } = req.body;
  appendLog(`${getUTCDateTime()} >>> Account ID: ${accountId}`);
  appendLog(`${getUTCDateTime()} >>> Auth Code: ${accountAuthCode}`);

  // Check if authCode ends with '0000'
  if (accountId && accountAuthCode.endsWith('0000')) {
    console.error(`${getUTCDateTime()} >>> User Authorization Failed. Auth code ends with '0000'`);
    res.redirect("/failure");
    return; // Exit the function
  } else {
    appendLog(`${getUTCDateTime()} >>> User Authorization Success.`);
  }

  appendLog(`${getUTCDateTime()} >>> Call Concur Auth API`);
  appendLog(`${getUTCDateTime()} >>> grant_type=password`);
  appendLog(`${getUTCDateTime()} >>> credtype=authtoken`);
  appendLog(`${getUTCDateTime()} >>> username=${authId}`);
  appendLog(`${getUTCDateTime()} >>> password=${authRequestToken}`);

  const request = require("request");
  const options = {
    method: "POST",
    url: "https://us.api.concursolutions.com/oauth2/v0/token",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    form: {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "password",
      credtype: "authtoken",
      username: authId,
      password: authRequestToken,
    },
  };

  try {
    request(options, function (error, response) {
      if (error) {
        console.error(`${getUTCDateTime()} >>> Error: ${error.message}`);
        res.redirect("/failure");
        return;
      }
      appendLog(`${getUTCDateTime()} >>> Concur-Correlationid: ${response.headers["concur-correlationid"]}`);
      appendLog(`${getUTCDateTime()} >>> Response Body:`);
      const responseJson = JSON.parse(response.body);
      appendLog(`${getUTCDateTime()} --- expires_in: ${responseJson.expires_in}`);
      appendLog(`${getUTCDateTime()} --- scope: ${responseJson.scope}`);
      appendLog(`${getUTCDateTime()} --- token_type: ${responseJson.token_type}`);
      appendLog(`${getUTCDateTime()} --- refresh_token: ${responseJson.refresh_token}`);
      appendLog(`${getUTCDateTime()} --- refresh_token_expires_in: ${responseJson.refresh_token_expires_in}`);
      appendLog(`${getUTCDateTime()} --- geolocation: ${responseJson.geolocation}`);
      appendLog(`${getUTCDateTime()} --- access_token: ${responseJson.access_token}`);      
      const accessJwtToken = JSON.stringify(parseJwt(responseJson.access_token),null,4);
      appendLog(`${getUTCDateTime()} --- decoded access-token: ${accessJwtToken}`);
      const idJwtToken = JSON.stringify(parseJwt(responseJson.id_token),null,4);;
      appendLog(`${getUTCDateTime()} --- decoded id_token: ${idJwtToken}`);

      res.redirect("/success");
    });
  } catch (error) {
    if (error.response) {
      // Log the response headers when an error is caught
      appendLog(`${getUTCDateTime()} >>> concur-correlationid: ${error.response.headers["concur-correlationid"]}`);
    }
    console.error(`${getUTCDateTime()} >>> Error: ${error.message}`);
    res.redirect("/failure");
  }

});

//////////////////////////////////////////////
// AUTHORIZE SUCCESS PAGE
app.get("/success", (req, res) => {
  appendLog(`${getUTCDateTime()} >>> Redirect to Connection Success Page.`);
  res.render("success");
});

//////////////////////////////////////////////
// AUTHORIZE FAILURE PAGE
app.get("/failure", (req, res) => {
  appendLog(`${getUTCDateTime()} >>> Redirect To Show Connection Failure Page.`);
  res.render("failure");
});

//////////////////////////////////////////////
// GET /showlogs endpoint to display log messages
app.get("/showlogs", (req, res) => {
  // Render the logs.ejs template with logMessages and send it as a response
  res.render("showlogs");
});

//////////////////////////////////////////////
// GET /fetchlogs endpoint to retrieve log messages
app.get("/fetchlogs", (req, res) => {
  // Send the logMessages array as a JSON response
  res.send(logMessages);
});


//////////////////////////////////////////////
app.listen(port, () => {
  console.log(`${getUTCDateTime()} >>> Server is listening at port ${port}`);
});
