import * as express from 'express';

/**
 * This file emulates a relying party receiving data from the EUDIPLO middleware.
 */

const app = express();
const port = process.env.PORT || 3001;

/**
 * receive the data from one credential and consume it in another one.
 */
app.use(express.json());
app.post('/process', (req, res) => {
    const presented = req.body;
    console.log('Received webhook:');
    console.log(JSON.stringify(presented, null, 2));
    res.status(200).send({
        citizen: {
            town: `You live in ${presented.credentials[0].address.locality}`,
        },
    });
});

/**
 * Receive the data the got received from the middleware
 */
app.post('/consume', (req, res) => {
    const presented = req.body;
    console.log('Received consume webhook:', presented);
    res.status(200).send();
});

app.listen(port, () => {
    console.log(`EUDIPLO handler running on http://localhost:${port}`);
});
