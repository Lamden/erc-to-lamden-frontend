Produces a static site that uses netlify's serverless architecture.

## setup
Add Infra network details (projectID) to the testnet and mainnet objects exported from `src/conf.js`


The serverless function needs two environment variables to work, feel free to mock this.

process.env.NETWORK_TESTNET and process.env.PRIVATE_KEY_TESTNET set  for `functions/sign.js`to function, but feel free to mock.

#