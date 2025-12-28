import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { createHash } from 'crypto';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type CanonicalEvent = {
  clientId: string;
  metric: string;
  amount: number;
  timestamp: Date;
};

/**
 * Normalizes raw event data into a strict canonical format.
 * @param rawData - The raw, potentially unreliable event data.
 * @returns The normalized canonical event data.
 * @throws Error if required fields are missing or invalid.
 */
export function normalizeData(rawData: any): CanonicalEvent {
  if (typeof rawData !== 'object' || rawData === null) {
    throw new Error('Payload must be a JSON object.');
  }

  const { client_id, clientId, metric, amount, amt, value, timestamp } = rawData;

  const finalClientId = clientId || client_id;
  if (typeof finalClientId !== 'string' || finalClientId.trim() === '') {
    throw new Error('Missing or invalid clientId/client_id (must be a non-empty string).');
  }

  if (typeof metric !== 'string' || metric.trim() === '') {
    throw new Error('Missing or invalid metric (must be a non-empty string).');
  }

  const finalAmount = amount ?? amt ?? value;
  if (typeof finalAmount !== 'number' || !isFinite(finalAmount)) {
    throw new Error('Missing or invalid amount/amt/value (must be a number).');
  }
  
  const finalTimestamp = timestamp ? new Date(timestamp) : new Date();
  if (isNaN(finalTimestamp.getTime())) {
    throw new Error('Invalid timestamp format.');
  }

  return {
    clientId: finalClientId,
    metric,
    amount: finalAmount,
    timestamp: finalTimestamp,
  };
}


/**
 * Generates a SHA-256 hash for a canonical event to ensure idempotency.
 * The object is stringified with sorted keys to ensure a consistent hash.
 * @param event - The canonical event object.
 * @returns A SHA-256 hash as a hex string.
 */
export function generateContentHash(event: CanonicalEvent): string {
  // Create a stable string representation by sorting keys
  const sortedEvent: any = {};
  Object.keys(event).sort().forEach(key => {
    // @ts-ignore
    sortedEvent[key] = event[key];
  });
  
  const dataString = JSON.stringify(sortedEvent);

  return createHash('sha256').update(dataString).digest('hex');
}
