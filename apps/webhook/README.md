# Webhook simulator

To test the webhook functionality of the EUDIPLO service, you can use this
simple webhook simulator.

It will spin up a local server with endpoints to receive webhook calls. You can also deploy it to cloudflare worker in case you want to test it with a hosted EUDIPLO instance that can not access your local machine.

## Setup

Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

```bash
npm install
```

This will also install `wrangler`, the Cloudflare Workers CLI, which is used to deploy the simulator to Cloudflare. You do not need a cloudflare account to run the simulator locally, but you will need one to deploy it.

## Run locally

You can start the simulator locally by running:

```bash
npm start
```

This will start a local server on port 8787.

## Deploy to Cloudflare Worker

To deploy the webhook simulator to a Cloudflare Worker, you can use the following command:

```bash
npm run deploy
```

It will print out the URL of the deployed worker, which you can use to test the webhook functionality with a hosted EUDIPLO instance or a local instance.
