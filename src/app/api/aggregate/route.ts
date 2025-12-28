import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic'; // Ensures the route is not cached

export async function GET() {
  try {
    const aggregates = await prisma.event.groupBy({
      by: ['clientId'],
      _count: {
        _all: true,
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        clientId: 'asc',
      }
    });

    // Format the data for the frontend
    const formattedData = aggregates.map(agg => ({
      clientId: agg.clientId,
      eventCount: agg._count._all,
      totalAmount: agg._sum.amount ?? 0,
    }));

    return NextResponse.json(formattedData, { status: 200 });
  } catch (error) {
    console.error("Aggregation error:", error);
    return NextResponse.json({ error: "Failed to retrieve aggregated data." }, { status: 500 });
  }
}
