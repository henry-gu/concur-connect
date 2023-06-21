const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");

const port = 3030;
const app = express();

const clientId = "646a2339-1632-4692-8be6-84534f5b41fc";
const clientSecret = "903a53f0-d11d-4a1f-b348-2d7b3f1afddc";

let authId, authRequestToken;

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.redirect("/connect");
});

app.get("/connect", (req, res) => {
  authId = req.query.id;
  authRequestToken = req.query.requestToken;
  console.log(`--> request for the landing page...`);
  console.log(`--> id=${authId}; requestToken=${authRequestToken}`);
  res.render("connect");
});

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
