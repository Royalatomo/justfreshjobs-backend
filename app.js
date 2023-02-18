const express = require("express");
const bodyParser = require("body-parser");
const mailchimp = require("@mailchimp/mailchimp_marketing");
const cors = require("cors");
const fetch = require("isomorphic-fetch");

require("dotenv").config();

const app = express();

// middleware
app.use(express.json());
app.use(cors());
app.use(bodyParser.json({ limit: "200kb" }));
app.use(bodyParser.urlencoded({ extended: false }));

mailchimp.setConfig({
  apiKey: process.env.MAIL_CHIMP_API_KEY,
  server: "us21",
});

app.post("/contact", async (req, res) => {
  const email = req.body.email;
  const message = req.body.message;
  const first_name = req.body.first_name;
  const last_name = req.body.last_name;
  const phone = req.body.phone;
  const recaptcha = req.body.recaptcha;

  if (!email || !message || !first_name || !last_name || !phone || !recaptcha) return res.status(403).send({error: "Missing Fields", code: 1});

  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptcha}`;

  const request_google = await fetch(url, { method: "post" });
  const responce_google = await request_google.json();

  if (!responce_google) return res.status(403).send({error: "Recaptcha Error", code: 1});

  const response = await mailchimp.lists.batchListMembers(process.env.MAIL_CHIMP_AUDIENCE, {
    members: [{ email_address: email, status: "subscribed", merge_fields: {MSG: message, FNAME: first_name, LNAME: last_name, PHONE: phone} }],
    update_existing: true
  });

  if (response.error_count > 0) {
    res.send({msg: "Error Occured", code: 1});
  }else {
    res.send({msg: "Message Sent", code: 0});
  }
});

app.post("/subscribe", async (req, res) => {
  const email = req.body.email;

  if (!email) return res.status(403).send({error: "Email Not Specified", code: 1});

  const response = await mailchimp.lists.batchListMembers(process.env.MAIL_CHIMP_AUDIENCE, {
    members: [{ email_address: email, status: "pending", merge_fields: {MSG: "none", FNAME: "none", LNAME: "none"} }],
  });

  if (response.error_count > 0) {
    res.send({msg: "Already Subscribed", code: 1});
  }else {
    res.send({msg: "Verify your email", code: 0});
  }
});

app.listen(process.env.PORT || 4000, () => console.log("Server Started " + process.env.PORT || "4000"));
