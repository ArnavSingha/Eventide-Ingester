# Eventide Ingester - System Design

This document answers key design questions about the Eventide Ingester system.

### What assumptions did you make?

1.  **Event Structure**: I assumed that despite variations, all incoming events would contain fields that could be logically mapped to `clientId`, `metric`, `amount`, and `timestamp`. The normalization layer is built on this assumption, with specific aliases (e.g., `client_id` for `clientId`, `amt` or `value` for `amount`).
2.  **Idempotency Content**: I assumed that the combination of all fields in the *normalized* canonical event object is sufficient to uniquely identify an event. Two events with the exact same normalized content are considered duplicates.
3.  **Data Volume**: The current solution is designed for low-to-medium traffic. It uses a single serverless function for ingestion and a single database instance. It does not account for massive, concurrent data streams that would require a more distributed architecture (e.g., a message queue).
4.  **Failure Modes**: The "Simulate Failure" option covers a specific, critical failure mode (database write failure after successful validation). I assumed this is a representative and important failure case to handle gracefully.
5.  **Database**: The system uses a relational database (via Prisma) with a unique constraint on a hash column to handle deduplication. This is a core assumption for the idempotency mechanism.

### How does your system prevent double counting?

The system prevents double counting through a content-based idempotency mechanism:

1.  **Normalization**: Every incoming event is first converted into a strict, canonical format. This ensures that two semantically identical events will have the same structure, regardless of their original, raw format.
2.  **Content Hashing**: After normalization, a SHA-256 hash is generated from the entire canonical event object. To ensure the hash is consistent, the object's keys are sorted alphabetically before being stringified.
3.  **Unique Database Constraint**: This generated hash is stored in a dedicated `hash` column in the `Event` table. This column has a `UNIQUE` constraint at the database level.
4.  **Graceful Error Handling**:
    *   When the API attempts to `prisma.event.create()` a new event, the database checks if the `hash` already exists.
    *   If the hash is unique, the event is inserted, and the API returns a `201 Created` response.
    *   If the hash already exists, the database throws a unique constraint violation error (Prisma's `P2002`). The API catches this specific error, recognizes it as a duplicate, and returns a `200 OK` response with the message "Duplicate event ignored."

This approach guarantees that even if a client retries sending the same event multiple times, it will only be processed and stored once.

### What happens if the database fails mid-request?

This scenario is handled safely to prevent data loss or double processing on retry. Here is the sequence of events:

1.  **Event Received**: The `/api/ingest` endpoint receives a raw JSON payload.
2.  **Validation & Normalization**: The payload is parsed and normalized. If this fails, a `400 Bad Request` is sent, and the process stops.
3.  **Database Write Attempt**: The system attempts to save the normalized event (including its content hash) to the database.
4.  **Database Failure**: The database write operation fails for a reason other than a unique constraint violation (e.g., connection loss, timeout, disk full).
5.  **Error Response**: The API catches the generic database error and returns a `500 Internal Server Error` response to the client. Crucially, it does **not** confirm success.

**On Client Retry:**

1.  The client, having received a `500` error, retries the same request.
2.  The system repeats the process: it receives, validates, and normalizes the event, generating the **exact same content hash** as before.
3.  This time, when it attempts the database write, one of two things will happen:
    *   **If the previous write actually succeeded** (but the response failed to reach the client), the database will now correctly reject the insert due to the unique constraint on the hash. The system will return a `200 OK` ("Duplicate event ignored"), achieving idempotency.
    *   **If the previous write genuinely failed**, the new write attempt will proceed. If it succeeds this time, the event is saved. If it fails again, another `500` error is returned, and the client can retry again.

This ensures the system is **eventually consistent** and that no valid data is lost or duplicated due to transient database failures.

### What would break first at scale?

1.  **The API Ingestion Endpoint**: The current `/api/ingest` route is a single, synchronous, serverless function. As traffic increases, this endpoint will become a bottleneck. High request volume could lead to cold start latency, timeouts, and resource exhaustion on the single database connection pool available to the function. It is the most likely component to fail first under heavy load.
2.  **The Database**: A single database instance, especially a serverless one, has limits on concurrent connections, IOPS, and throughput. Under high write load from the ingestion endpoint and high read load from the aggregation API, it would eventually struggle to keep up, leading to slow queries and connection timeouts.
3.  **The Aggregation API**: The `/api/aggregate` endpoint performs a `groupBy` query across the entire `Event` table. As the table grows to millions or billions of rows, this query will become progressively slower and more resource-intensive, potentially timing out or impacting the performance of the write operations on the same database.

To mitigate these issues at scale, one would introduce a message queue (like Google Pub/Sub or AWS SQS) between the API endpoint and the processing logic, use a more robust and scalable database solution (like a provisioned cluster or a horizontally scalable database), and implement a caching layer or pre-computed rollups for the aggregation results.
