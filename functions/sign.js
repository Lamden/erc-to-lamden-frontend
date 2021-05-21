//@ts-check
"use strict";
require('dotenv').config();

const Web3Eth = require('web3-eth');
const Web3Utils = require('web3-utils');

const NODE_ENV = process.env.NODE_ENV || "dev"

let networkInfo = {}

if (NODE_ENV == "dev"){
	networkInfo = {
		testnet: {
			PRIVATE_KEY: '0617daa72f2a44536f58e34aaa641beb8a19933a392efd059bd7eeb7348999ca',
			NETWORK: 'wss://kovan.infura.io/ws/v3/5ef3994ede0945f6beb3fbddef483643'
		}
	}

}else{
	networkInfo = {
		mainnet: {
			PRIVATE_KEY: process.env.PRIVATE_KEY_MAINNET,
			NETWORK: process.env.NETWORK_MAINNET,
		},
		testnet: {
			PRIVATE_KEY: process.env.PRIVATE_KEY_MAINNET,
			NETWORK: process.env.NETWORK_TESTNET,
		}
	}
}

function sign(data, network) {
	// @ts-ignore
	const eth = new Web3Eth(networkInfo[network].NETWORK);

	data = Web3Utils.soliditySha3('0x' + data);
	
	return eth.accounts.sign(data, networkInfo[network].PRIVATE_KEY)
}

exports.handler = async function(event) {
	if (event.httpMethod === "GET") return {statusCode: 500}
	const { network } = event.queryStringParameters

	console.log({network, networkInfo})
	if (!network) return {statusCode: 500}
	if (network !== "testnet" && network !== "mainnet") return {statusCode: 500}

	let unSignedABI = event.body;
	unSignedABI = unSignedABI.substring(1, unSignedABI.length - 1);
	const signedABIObj = sign(unSignedABI, network);

	return {
		statusCode: 200,
		body: JSON.stringify(signedABIObj)
	};
}