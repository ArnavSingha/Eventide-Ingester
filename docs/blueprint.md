# **App Name**: Eventide Ingester

## Core Features:

- Data Ingestion API: An API endpoint at /api/ingest that accepts JSON payloads and returns a success or error response.
- Data Normalization: Normalizes unreliable data into a canonical format: { client_id: string, metric: string, amount: number, timestamp: Date }.
- Idempotency with SHA-256: Generates a SHA-256 hash of the normalized data to prevent double-counting, using the hash as the unique constraint in the SQLite database.
- Simulated Failure: A checkbox in the frontend to simulate data processing failures for testing purposes. The API will validate data but throw an error before committing it to the database, when the 'simulate failure' option is activated.
- Data Aggregation API: An API endpoint to return total counts and sums of amounts by client. Serves a generic data aggregation function based on client.
- Frontend Form: A form in the frontend to submit raw JSON data to the /api/ingest endpoint, styled using Tailwind CSS.
- Aggregated Results View: A dashboard view in the frontend to display aggregated results (counts and sums) fetched from the Data Aggregation API, styled using Tailwind CSS.

## Style Guidelines:

- Primary color: Deep Indigo (#4F46E5) to represent reliability and depth.
- Background color: Very light Lavender (#F3F2FA). The background is a lighter tint of the primary, maintaining the cool feeling.
- Accent color: Electric Purple (#A3A0FB) for interactive elements.
- Body and headline font: 'Inter' sans-serif, for a modern, machined, objective look; the font is suitable for both headlines and body text.
- Simple, outline-style icons to represent different data metrics and clients.
- Clean, minimalist layout with clear separation of form and dashboard sections.
- Subtle animations for loading states and data updates.