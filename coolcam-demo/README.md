# CoolCam

CoolCam is a school project concept for a wide-angle camera that mounts on a fridge door. The demo shows a sample fridge inventory, expiry reminders, voice interaction, a proposed appliance-connected free tier, and an optional AI subscription.

## Concept pricing

- **Camera: $79.99 one time.** Wide-angle fridge-door camera concept.
- **Free app:** fridge inventory, expiry dates, voice controls, and compatible appliance connections.
- **CoolCam AI: $10/month.** Personalized recipe ideas, grocery ordering, and calorie tracking.

These are proposed features and prices, not an active store or subscription. Camera image recognition, Alexa/Google Nest connections, grocery ordering, billing, live store prices, and production AI are not connected in this prototype. The app uses sample data and local browser state.

## Privacy concept

The settings page demonstrates a privacy preference, not a security feature. There is no MCP server, encryption layer, or AI backend in this demo. A future MCP gateway could give an AI assistant narrowly scoped access to the ingredient information needed for a request. MCP is a protocol; privacy would still depend on the gateway, permissions, data handling, and connected services.

## Run locally

From the repository root (the folder containing `package.json`):

```sh
npm install
npm run dev
```

## Publish with GitHub Pages

The repository workflow in [`../.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) builds this Vite app and publishes it to GitHub Pages when changes are pushed to `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. If the default branch has a different name, update the workflow trigger.

The Vite build uses relative asset paths so it works both at a project URL (`username.github.io/repository/`) and at a custom domain.

## Demo controls

- Use the top navigation on desktop or bottom navigation on a small screen to explore the app.
- Add and edit food, simulate a sample scan, tap the microphone for browser speech recognition, or use the preset prompts if your browser does not support it. **Hear reply** uses browser speech playback. Some browsers may send microphone audio to their speech service; no audio or transcript is sent to an AI backend.
- Ask the assistant about inventory, quantities, expiration dates, calories, or recipes using ingredients you name. Responses are improved local demo logic, not a connected AI model.
- In **Assistant → Order**, choose Uber Grocery or DoorDash as the preferred delivery app, then compare an example basket with Food Lion and Harris Teeter estimates. Prices are illustrative, with no live price feed or store integration.
- This prototype does not connect a real camera, AI service, MCP server, external appliance, checkout, or payment method.
