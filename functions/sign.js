//@ts-check
"use strict";
require('dotenv').config();

const Web3Eth = require('web3-eth');
const Web3Utils = require('web3-utils');

const NODE_ENV = process.env.NODE_ENV || "dev"

if (NODE_ENV == "dev"){
  var PRIVATE_KEY = '0617daa72f2a44536f58e34aaa641beb8a19933a392efd059bd7eeb7348999ca';
  var NETWORK = 'wss://kovan.infura.io/ws/v3/63ded85a9a5442c6ae2b94c2e97fb8c4';
}else{
  var PRIVATE_KEY = process.env.PRIVATE_KEY
  var NETWORK = process.env.NETWORK
}

const eth = new Web3Eth(NETWORK);

function sign(data) {
  // @ts-ignore
  data = Web3Utils.soliditySha3('0x' + data);
  return eth.accounts.sign(data, PRIVATE_KEY)
}

exports.handler = async function(event) {
  console.log(event)
  console.log(event.body)
  let unSignedABI = event.body;
  console.log({unSignedABI})
  unSignedABI = unSignedABI.substring(1, unSignedABI.length - 1);
  const signedABIObj = sign(unSignedABI);
  return {
    statusCode: 200,
    body: JSON.stringify(signedABIObj)
  };
}