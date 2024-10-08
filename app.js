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
let refreshToken = null; // Initialize refreshToken as null
let accessToken = null; // Initialize accessToken as null
let companyUUID = null;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//////////////////////////////////////////////
function getUTCDateTime() {
  const utcTime = new Date().toISOString().slice(0, -1); // remove last character
  return utcTime + " UTC";
}

function appendLog(logMessage) {
  //logMessages.unshift(logMessage);
  logMessages.push(logMessage);
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

    // // Print the decoded token header and payload
    // console.log('Decoded Token Header:');
    // console.log(decodedToken.header);
    // console.log('Decoded Token Payload:');
    // console.log(decodedToken.payload);

    return decodedToken;
  } catch (error) {
    console.error('An error occurred:', error.message);
    return null;
  }
}

function unixTimestampToUTC(unixTimestamp) {
  const utcDate = new Date(unixTimestamp * 1000); // Multiply by 1000 to convert seconds to milliseconds
  const year = utcDate.getUTCFullYear();
  const month = utcDate.getUTCMonth() + 1; // Month is 0-based, so add 1
  const day = utcDate.getUTCDate();
  const hours = utcDate.getUTCHours();
  const minutes = utcDate.getUTCMinutes();
  const seconds = utcDate.getUTCSeconds();

  const utcTimeString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return utcTimeString;
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
  // const queryUrl = req.url.split('?')[0];
  const queryUrl = req.url;

  appendLog(`========================================================================`);
  appendLog(`${getUTCDateTime()} >>> REDIRECT TO THE LANDING PAGE`);
  appendLog(`------------------------------------------------------------------------`);
  appendLog(`Server Address=${serverAddress}`);
  appendLog(`Query URL=${queryUrl}`);
  appendLog(`Query Parameters:`);
  appendLog(`-- id=${authId}`);
  appendLog(`-- requestToken=${authRequestToken}`);
  appendLog(`-- userId=${authUserId}`);
  appendLog(``);

  res.render("connect");
});

//////////////////////////////////////////////
// AUTHORIZE THE TOKEN REQUEST
app.post("/auth", async (req, res) => {

  // Get the "account-id" and "auth-code" from the request body
  const { 'account-id': accountId, 'auth-code': accountAuthCode } = req.body;
  appendLog(`========================================================================`);
  appendLog(`${getUTCDateTime()} >>> AUTHORIZE COMPANY IDENTITY`);
  appendLog(`------------------------------------------------------------------------`);
  appendLog(`Account ID: ${accountId}`);
  appendLog(`Auth Code: ${accountAuthCode}`);
  appendLog(``);

  // Check if authCode ends with '0000'
  if (accountId && accountAuthCode.endsWith('0000')) {
    appendLog(`COMPANY AUTHORIZATION FAILED`);
    appendLog(`ERROR: Auth code should not end with '0000'`);
    appendLog(``);

    res.redirect("/failure");
    return; // Exit the function
  } else {
    appendLog(`>>> COMPANY AUTHORIZATION SUCCESS`);
    appendLog(``);
  }

  appendLog(`========================================================================`);
  appendLog(`${getUTCDateTime()}  >>> CALL OAUTH2 API TO REQUEST TOKEN`);
  appendLog(`------------------------------------------------------------------------`);
  appendLog(`Method="POST"`);
  appendLog(`URL="https://us.api.concursolutions.com/oauth2/v0/token"`);
  appendLog(`Content-Type=""application/x-www-form-urlencoded"`);
  appendLog(`-- client_id=${clientId.slice(0, 16)}${"x".repeat(20)}`);
  appendLog(`-- client_secret=${"x".repeat(36)}`);
  appendLog(`-- grant_type="password"`);
  appendLog(`-- credtype="authtoken"`);
  appendLog(`-- username="${authId}"`);
  appendLog(`-- password="${authRequestToken}"`);
  appendLog(`------------------------------------------------------------------------`);

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
        appendLog(`${getUTCDateTime()} >>> ERROR: CALL OAUTH2 API`);
        console.error(`Error: ${error.message}`);
        res.redirect("/failure");
        return;
      }

      appendLog(`Response Status: ${response.statusCode}`);
      appendLog(`Response Header:`);
      appendLog(`"concur-correlationid": ${response.headers["concur-correlationid"]}`);
      appendLog(`Response Body:`);
      const responseJson = JSON.parse(response.body);
      appendLog(`"expires_in": ${responseJson.expires_in}`);
      appendLog(`"scope": ${responseJson.scope}`);
      appendLog(`"token_type": ${responseJson.token_type}`);
      appendLog(`"refresh_token": ${responseJson.refresh_token}`);
      refreshToken = responseJson.refresh_token;
      const expireTimeUTC = unixTimestampToUTC(responseJson.refresh_expires_in);
      appendLog(`"refresh_expires_in": ${responseJson.refresh_expires_in} (UTC: ${expireTimeUTC})`);
      appendLog(`"geolocation": ${responseJson.geolocation}`);
      accessToken = responseJson.access_token;
      appendLog(`"access_token":${accessToken.slice(0, 30)}${".".repeat(20)}${accessToken.slice(-20)}`);
      const idToken = responseJson.id_token;
      appendLog(`"id_token": ${idToken.slice(0, 30)}${".".repeat(20)}${idToken.slice(-20)}`);
      appendLog(`------------------------------------------------------------------------`);
      const accessJwtTokenPayload = JSON.stringify(parseJwt(responseJson.access_token), null, 4);
      appendLog(`<JWT decoded access-token >:`);
      appendLog(`${accessJwtTokenPayload}`);
      appendLog(`------------------------------------------------------------------------`);
      const idTokenJWT = parseJwt(responseJson.id_token);
      const idTokenJWTPayload = JSON.stringify(idTokenJWT, null, 4);;
      companyUUID = idTokenJWT.payload.sub;
      appendLog(`<JWT decoded id_token >:`);
      appendLog(`${idTokenJWTPayload}`);
      appendLog(`company UUID = ${companyUUID}`);
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
  appendLog(`========================================================================`);
  appendLog(`${getUTCDateTime()}  >>> REDIRECT TO SUCCESS MESSAGE PAGE`);
  appendLog(`------------------------------------------------------------------------`);
  appendLog(``);
  res.render("success");
});

//////////////////////////////////////////////
// AUTHORIZE FAILURE PAGE
app.get("/failure", (req, res) => {
  appendLog(`========================================================================`);
  appendLog(`${getUTCDateTime()}  >>> REDIRECT TO FAILURE MESSAGE PAGE`);
  appendLog(`------------------------------------------------------------------------`);
  appendLog(``);

  res.render("failure");
});

//////////////////////////////////////////////
// POST /refreshtoken endpoint to refresh the token
app.post("/refreshtoken", async (req, res) => {

  appendLog(`========================================================================`);
  appendLog(`${getUTCDateTime()}  >>> CALL OAUTH2 API TO REFRESH TOKEN`);
  appendLog(`------------------------------------------------------------------------`);
  appendLog(`Method="POST"`);
  appendLog(`URL="https://us.api.concursolutions.com/oauth2/v0/token"`);
  appendLog(`Content-Type=""application/x-www-form-urlencoded"`);
  appendLog(`-- client_id=${clientId.slice(0, 16)}${"x".repeat(20)}`);
  appendLog(`-- client_secret=${"x".repeat(36)}`);
  appendLog(`-- grant_type="refresh_token"`);
  appendLog(`-- refresh_token="${refreshToken.slice(0, 30)}xxxxxxx"`);
  appendLog(``);


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
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    },
  };

  try {
    request(options, function (error, response) {
      if (error) {
        appendLog(`ERROR: CALL OAUTH2 REFRESH TOKEN API`);
        console.error(`Error: ${error.message}`);
        res.redirect("/failure");
        return;
      }

      appendLog(`Response Status: ${response.statusCode}`);
      appendLog(`Response Header:`);
      appendLog(`"concur-correlationid": ${response.headers["concur-correlationid"]}`);
      appendLog(`Response Body:`);
      const responseJson = JSON.parse(response.body);
      appendLog(`"expires_in": ${responseJson.expires_in}`);
      appendLog(`"scope": ${responseJson.scope}`);
      appendLog(`"token_type": ${responseJson.token_type}`);
      appendLog(`"refresh_token": ${responseJson.refresh_token}`);
      refreshToken = responseJson.refresh_token;
      const expireTimeUTC = unixTimestampToUTC(responseJson.refresh_expires_in);
      appendLog(`"refresh_expires_in": ${responseJson.refresh_expires_in} (UTC: ${expireTimeUTC})`);
      appendLog(`"geolocation": ${responseJson.geolocation}`);
      accessToken = responseJson.access_token;
      appendLog(`"access_token":${accessToken.slice(0, 30)}${".".repeat(20)}${accessToken.slice(-20)}`);
      const idToken = responseJson.id_token;
      appendLog(`"id_token": ${idToken.slice(0, 30)}${".".repeat(20)}${idToken.slice(-20)}`);
      appendLog(`------------------------------------------------------------------------`);
      const accessJwtTokenPayload = JSON.stringify(parseJwt(responseJson.access_token), null, 4);
      appendLog(`<JWT decoded access-token >:`);
      appendLog(`${accessJwtTokenPayload}`);
      appendLog(`------------------------------------------------------------------------`);
      const idTokenJWT = parseJwt(responseJson.id_token);
      const idTokenJWTPayload = JSON.stringify(idTokenJWT, null, 4);;
      companyUUID = idTokenJWT.payload.sub;
      appendLog(`<JWT decoded id_token >:`);
      appendLog(`${idTokenJWTPayload}`);
      appendLog(`company UUID = ${companyUUID}`);
      appendLog(``);
      res.sendStatus(200);
    });
  } catch (error) {
    if (error.response) {
      // Log the response headers when an error is caught
      appendLog(`${getUTCDateTime()} >>> concur-correlationid: ${error.response.headers["concur-correlationid"]}`);
    }
    console.error(`${getUTCDateTime()} >>> Error: ${error.message}`);
    res.sendStatus(500);
  }
});
  
//////////////////////////////////////////////
// POST /getcompanyinfo endpoint to get company info
app.post("/getcompanyinfo", async (req, res) => {
  appendLog(`========================================================================`);
  appendLog(`${getUTCDateTime()}  >>> GET COMPANY INFO`);
  appendLog(`------------------------------------------------------------------------`);
  appendLog(`Method="GET"`);
  appendLog(`URL="https://us.api.concursolutions.com/profile/v1/principals/${companyUUID}"`);
  appendLog(`Headers:`);
  appendLog(` -- Authorization: Bearer ${accessToken.slice(0, 30)}${".".repeat(20)}${accessToken.slice(-20)}`);
  const request = require("request");
  const options = {
    method: "GET",
    url: `https://us.api.concursolutions.com/profile/v1/principals/${companyUUID}`,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
    },
  };

  try {
    request(options, function (error, response) {
      if (error) {
        appendLog(`>>> ERROR: CALL PROFILE V1 TO GET COMPANT PROFILE`);
        console.error(`Error: ${error.message}`);
        res.redirect("/failure");
        return;
      }

      appendLog(`Response Status: ${response.statusCode}`);
      appendLog(`Response Header:`);
      appendLog(`"concur-correlationid": ${response.headers["concur-correlationid"]}`);
      appendLog(`Response Body:`);
      const responseJson = JSON.parse(response.body);
      const beautifiedJson = JSON.stringify(responseJson, null, 2);
      appendLog(`${beautifiedJson}`);
      appendLog(`------------------------------------------------------------------------`);
      const companyExpense = responseJson["com:concur:Expense:0.1"];
      const marketingName = companyExpense.marketingName || null;
      appendLog(`"Concur Edition": ${marketingName=== 'CTE'? 'Professional':'Standard'}`);
      appendLog(``);

      res.sendStatus(200);
    });
  } catch (error) {
    if (error.response) {
      // Log the response headers when an error is caught
      appendLog(`${getUTCDateTime()} >>> concur-correlationid: ${error.response.headers["concur-correlationid"]}`);
    }
    console.error(`${getUTCDateTime()} >>> Error: ${error.message}`);
    res.sendStatus(500);
  }
});


//////////////////////////////////////////////
// GET /logview endpoint to display log messages
app.get("/logview", (req, res) => {
  // Render the logs.ejs template with logMessages and send it as a response
  res.render("logview", {
    logMessages,
    accessToken,
    refreshToken,
  });
});

//////////////////////////////////////////////
// GET /fetchlogs endpoint to retrieve log messages
app.get("/fetchlogs", (req, res) => {
  // Send the logMessages array as a JSON response
  res.send(logMessages);
});

//////////////////////////////////////////////
// GET /fetchlogs endpoint to retrieve log messages
app.post("/clearlogs", (req, res) => {
  logMessages.splice(0,logMessages.length)
  res.sendStatus(200);
});

//////////////////////////////////////////////
app.listen(port, () => {
  console.log(`${getUTCDateTime()} >>> Server is listening at port ${port}`);
});
