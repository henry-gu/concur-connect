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
  console.log(`--> request for the landing page...`);
  console.log(`--> id=${authId}; requestToken=${authRequestToken}`);
  res.render("connect");
});


//////////////////////////////////////////////
// AUTHORIZE THE TOKEN REQUEST 
app.post("/auth", (req, res) => {
  console.log(`--> request to authorize the app connection...`);
  console.log(`--> id=${authId}; requestToken=${authRequestToken}`);

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
    console.log(" |---> Concur-Correlationid:" + response.headers["concur-correlationid"]);
    console.log(" |---> Response Body:");
    console.log(response.body);
  });

  res.redirect("/success");
});

app.get("/success", (req, res) => {
  console.log(`--> connect success...`);
  res.render("success");
});

app.get("/failure", (req, res) => {
  res.render("failure");
});

app.listen(port, () => {
  console.log("===> Server is listening at port " + port);
});
