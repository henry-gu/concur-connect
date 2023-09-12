require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const app = express();

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const port = parseInt(process.env.PORT) || 3030;


let authId, authRequestToken;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//////////////////////////////////////////////
function getUTCDateTime () {
  const utcTime = new Date().toISOString().slice(0, -1); // remove last character
  return utcTime + " UTC";
};

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
  console.log(`${getUTCDateTime()} >>> request for the landing page...`);
  console.log(`${getUTCDateTime()} >>> id=${authId}; requestToken=${authRequestToken}`);
  res.render("connect");
});


//////////////////////////////////////////////
// AUTHORIZE THE TOKEN REQUEST 
app.post("/auth", (req, res) => {
  console.log(`${getUTCDateTime()} >>>  request to authorize the app connection...`);
  console.log(`${getUTCDateTime()} >>>  id=${authId}; requestToken=${authRequestToken}`);

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

  request(options, function (error, response) {
    if (error) throw new Error(error);
    console.log(`${getUTCDateTime()} >>> Concur-Correlationid: ${response.headers["concur-correlationid"]}`);
    console.log(`${getUTCDateTime()} >>> Response Body:`);
    console.log(response.body);
  });

  res.redirect("/success");
});

//////////////////////////////////////////////
// AUTHORIZE SUCCESS PAGE 
app.get("/success", (req, res) => {
  console.log(`${getUTCDateTime()} >>> SUCCESS: Connection Authorized`);
  res.render("success");
});

//////////////////////////////////////////////
// AUTHORIZE FAILURE PAGE 
app.get("/failure", (req, res) => {
  res.render("failure");
});


app.listen(port, () => {
  console.log(`${getUTCDateTime()} >>> Server is listening at port ${port}`);
});
