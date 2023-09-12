require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const app = express();

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const port = parseInt(process.env.PORT) || 3030;

let authId, authRequestToken, authUserId, authUrl;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//////////////////////////////////////////////
function getUTCDateTime() {
  const utcTime = new Date().toISOString().slice(0, -1); // remove last character
  return utcTime + " UTC";
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

  console.log(`${getUTCDateTime()} >>> Load the landing page.`);
  console.log(`${getUTCDateTime()} >>> Server Address=${serverAddress}`);
  console.log(`${getUTCDateTime()} >>> Query endpoint=${queryUrl}`);


  console.log(`${getUTCDateTime()} >>> Query Parameters:`);
  console.log(`${getUTCDateTime()} >>> id=${authId}`);
  console.log(`${getUTCDateTime()} >>> requestToken=${authRequestToken}`);
  console.log(`${getUTCDateTime()} >>> userId=${authUserId}`);

  res.render("connect");
});

//////////////////////////////////////////////
// AUTHORIZE THE TOKEN REQUEST
app.post("/auth", async (req, res) => {

  // Get the "account-id" and "auth-code" from the request body
  const { 'account-id': accountId, 'auth-code': accountAuthCode } = req.body;
  console.log(`${getUTCDateTime()} >>> Account ID: ${accountId}`);
  console.log(`${getUTCDateTime()} >>> Auth Code: ${accountAuthCode}`);

  // Check if authCode ends with '0000'
  if (accountId && accountAuthCode.endsWith('0000')) {
    console.error(`${getUTCDateTime()} >>> User Authorization Failed. Auth code ends with '0000'`);
    res.redirect("/failure");
    return; // Exit the function
  } else {
    console.log(`${getUTCDateTime()} >>> User Authorization Success.`);
  }

  console.log(`${getUTCDateTime()} >>> Call Concur Auth API`);
  console.log(`${getUTCDateTime()} >>> grant_type=password`);
  console.log(`${getUTCDateTime()} >>> credtype=authtoken`);
  console.log(`${getUTCDateTime()} >>> username=${authId}`);
  console.log(`${getUTCDateTime()} >>> password=${authRequestToken}`);

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

      console.log(`${getUTCDateTime()} >>> Concur-Correlationid: ${response.headers["concur-correlationid"]}`);
      console.log(`${getUTCDateTime()} >>> Response Body:`);
      console.log(response.body);
      res.redirect("/success");
    });
  } catch (error) {
    if (error.response) {
      // Log the response headers when an error is caught
      console.log(`${getUTCDateTime()} >>> concur-correlationid: ${error.response.headers["concur-correlationid"]}`);
    }
    console.error(`${getUTCDateTime()} >>> Error: ${error.message}`);
    res.redirect("/failure");
  }

});

//////////////////////////////////////////////
// AUTHORIZE SUCCESS PAGE
app.get("/success", (req, res) => {
  console.log(`${getUTCDateTime()} >>> Redirect to Connection Success Page.`);
  res.render("success");
});

//////////////////////////////////////////////
// AUTHORIZE FAILURE PAGE
app.get("/failure", (req, res) => {
  console.log(`${getUTCDateTime()} >>> Redirect To Show Connection Failure Page.`);
  res.render("failure");
});

app.listen(port, () => {
  console.log(`${getUTCDateTime()} >>> Server is listening at port ${port}`);
});
