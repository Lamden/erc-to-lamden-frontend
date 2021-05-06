//@ts-check
"use strict";
require('dotenv').config();
const express = require("express");
const path = require("path");
const serverless = require("serverless-http");
const Web3 = require("web3");
const cors = require("cors");
const app = express();
const router = express.Router();


const NODE_ENV = process.env.NODE_ENV || "dev"

if (NODE_ENV == "dev"){
  var PRIVATE_KEY = '0617daa72f2a44536f58e34aaa641beb8a19933a392efd059bd7eeb7348999ca';
  var NETWORK = 'wss://kovan.infura.io/ws/v3/63ded85a9a5442c6ae2b94c2e97fb8c4';
}else{
  var PRIVATE_KEY = process.env.PRIVATE_KEY
  var NETWORK = process.env.NETWORK
}

const web3 = new Web3(NETWORK);


function sign(data) {
  // @ts-ignore
  data = web3.utils.soliditySha3('0x' + data);
  return web3.eth.accounts.sign(data, PRIVATE_KEY)
}

router.post("/sign", (req, res) => {
  let unSignedABI = req.body.unSignedABI;
  unSignedABI = unSignedABI.substring(1, unSignedABI.length - 1);
  const signedABIObj = sign(unSignedABI);
  res.json(signedABIObj);
});

app.use(cors());
app.use(express.json());
app.use("/.netlify/functions/server", router); // path must route to lambda
// app.use("/", (req, res) => res.sendFile(path.join(__dirname, "../index.html")));

module.exports = app;
module.exports.handler = serverless(app);
