# TikFinity DayZ Vercel Relay

This relay lets a friend send TikFinity or Twitch events to your DayZ bridge without opening ports on your PC.

## How It Works

- Friend bridge runs in `vercel-client` mode and sends events to this Vercel app.
- Your host bridge runs in `vercel-host` mode and polls this Vercel app every few seconds.
- Your host bridge writes the commands into your local DayZ queue folder.

## Deploy

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Log in to Vercel:

   ```powershell
   npx vercel login
   ```

3. Create or link the Vercel project:

   ```powershell
   npx vercel
   ```

4. Add Vercel KV storage to the project in the Vercel dashboard.

5. Add these environment variables in Vercel:

   ```text
   RELAY_SECRET=use_the_same_secret_as_the_bridge
   RELAY_HOST_ID=jenny
   ```

   Vercel KV adds its own `KV_REST_API_URL` and token variables automatically.

6. Deploy:

   ```powershell
   npx vercel deploy --prod
   ```

7. Test it in a browser:

   ```text
   https://your-vercel-project.vercel.app/api/health
   ```

## Bridge Settings

On the PC hosting the DayZ server:

```text
Relay Mode: vercel-host
Relay Secret: same value as RELAY_SECRET
Client Host URL: https://your-vercel-project.vercel.app
Relay Host ID: jenny
Poll Seconds: 2
```

On your friend's PC:

```text
Relay Mode: vercel-client
Relay Secret: same value as RELAY_SECRET
Client Host URL: https://your-vercel-project.vercel.app
Relay Host ID: jenny
```

Both bridges must use the same `Relay Secret`, `Client Host URL`, and `Relay Host ID`.
