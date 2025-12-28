import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeData, generateContentHash } from "@/lib/utils";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const simulateFailure = req.headers.get("x-simulate-failure") === "true";
    const rawData = await req.json();

    // 1. Normalization and Validation
    let normalizedEvent;
    try {
      normalizedEvent = normalizeData(rawData);
    } catch (error: any) {
      return NextResponse.json({ error: `Validation failed: ${error.message}` }, { status: 400 });
    }

    // 2. Idempotency Hashing
    const hash = generateContentHash(normalizedEvent);

    // 3. Failure Simulation
    if (simulateFailure) {
      // Data is valid, but we simulate a failure before DB commit.
      return NextResponse.json({ error: "Simulated processing failure." }, { status: 500 });
    }

    // 4. Database Insertion
    try {
      await prisma.event.create({
        data: {
          ...normalizedEvent,
          hash: hash,
        },
      });
      return NextResponse.json({ message: "Event ingested successfully." }, { status: 201 });
    } catch (error) {
      // Check for unique constraint violation (duplicate event)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // The target fields are in `error.meta.target`. We assume it's the hash.
        return NextResponse.json({ message: "Duplicate event ignored." }, { status: 200 });
      }
      
      // For other database errors
      console.error("Database error:", error);
      return NextResponse.json({ error: "Could not save event to the database." }, { status: 500 });
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "An unexpected internal server error occurred." }, { status: 500 });
  }
}
