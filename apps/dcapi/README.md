# DCAPI Demo

This project demonstrates how to use the EUDI Wallet DC API with Cloudflare Workers with EUDIPLO.

## Setup

1. **Clone the repository:**

   ```sh
   git clone <your-repo-url>
   cd dcapi
   ```

2. **Install Wrangler (Cloudflare Workers CLI):**

   ```sh
   npm install -g wrangler
   ```

3. **Set required secrets and environment variables:**

   The DC API requires the following secrets:
   - `INSTANCE_URL` (e.g. `https://service.eudi-wallet.dev`)
   - `CLIENT_ID` (your client ID)
   - `CLIENT_SECRET` (your client secret)
   - `PRESENTATION_ID` (your presentation request ID, e.g. `pid`)

   Set these using Wrangler:

   ```sh
   wrangler secret put INSTANCE_URL
   wrangler secret put CLIENT_ID
   wrangler secret put CLIENT_SECRET
   wrangler secret put PRESENTATION_ID
   ```

   You will be prompted to enter each value securely.

4. **Run locally for development:**

   ```sh
   wrangler dev
   ```

   This will serve the frontend and Worker locally.

5. **Deploy to Cloudflare:**

   ```sh
   wrangler deploy
   ```

## Usage

- Open the app in your browser.
- Click **Request Credential** to test the DC API flow.
- Console logs and verified values will appear in the UI.

## Notes

- **Do not commit secrets to source control.** Always use Wrangler secrets for sensitive values.
- The `.env` file is only used for local development and is not deployed to Cloudflare.
- All sensitive logic is handled in the Worker (`src/main.ts`).

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/commands/)
