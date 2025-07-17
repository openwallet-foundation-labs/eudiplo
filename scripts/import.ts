// this script imports the schemas that are in the issuance and presentation folder

import { readdirSync } from 'fs';

const url = 'http://localhost:3000';
const clientId = 'root';
const clientSecret = 'root';

type LoginReponse = {
    access_token: string;
};

async function run() {
    const accessToken = await fetch(`${url}/auth/token`, {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
        }),
    })
        .then((res) => res.json())
        .then((data: LoginReponse) => data.access_token);

    //import issuance
    readdirSync('issuance').forEach((file) => {
        void import(`./issuance/${file}`).then(async (module) => {
            module.id = file.replace('.json', '');
            await fetch(`${url}/issuer-management`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(module),
            }).then(
                () => {
                    console.log(`issuance: ${file} imported`);
                },
                (err) => {
                    console.log(err);
                },
            );
        });
    });

    //import presentation
    readdirSync('presentation').forEach((file) => {
        void import(`./presentation/${file}`).then(async (module) => {
            module.id = file.replace('.json', '');
            await fetch(`${url}/presentation-management`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(module),
            }).then(
                () => {
                    console.log(`presentation: ${file} imported`);
                },
                (err) => {
                    console.log(err);
                },
            );
        });
    });
}

void run();
