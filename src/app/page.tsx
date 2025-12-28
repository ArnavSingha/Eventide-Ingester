"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowRight, CheckCircle, Database, Server, UploadCloud } from "lucide-react";

type AggregatedData = {
  clientId: string;
  eventCount: number;
  totalAmount: number;
};

const initialJson = JSON.stringify(
  {
    client_id: "client-a-123",
    metric: "page_views",
    value: Math.floor(Math.random() * 100) + 1,
    timestamp: new Date().toISOString(),
  },
  null,
  2
);

export default function Home() {
  const [jsonData, setJsonData] = useState(initialJson);
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const [aggregatedData, setAggregatedData] = useState<AggregatedData[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchAggregatedData = async () => {
    setIsFetchingData(true);
    try {
      const response = await fetch("/api/aggregate");
      if (!response.ok) {
        throw new Error("Failed to fetch aggregated data");
      }
      const data = await response.json();
      setAggregatedData(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch aggregation statistics.",
      });
    } finally {
      setIsFetchingData(false);
    }
  };

  useEffect(() => {
    fetchAggregatedData();
  }, [refreshKey]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      JSON.parse(jsonData);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Invalid JSON",
        description: "Please check the format of your JSON payload.",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Simulate-Failure": simulateFailure.toString(),
        },
        body: jsonData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "An unknown error occurred");
      }
      
      toast({
        title: "Success",
        description: result.message || "Event processed successfully.",
        action: <CheckCircle className="text-green-500" />,
      });
      setRefreshKey(prev => prev + 1); // Trigger data refresh
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Ingestion Failed",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary font-headline">Eventide Ingester</h1>
          <p className="mt-2 text-lg text-muted-foreground">A Fault-Tolerant Data Processing System</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadCloud className="w-6 h-6" />
                <span>Submit Raw Event</span>
              </CardTitle>
              <CardDescription>Send a raw JSON event to the ingestion endpoint. The system will normalize, deduplicate, and process it.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="json-payload" className="text-sm font-medium">JSON Payload</Label>
                  <Textarea
                    id="json-payload"
                    value={jsonData}
                    onChange={(e) => setJsonData(e.target.value)}
                    rows={10}
                    className="mt-1 font-mono text-sm"
                    placeholder="Enter your JSON data here..."
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="simulate-failure"
                    checked={simulateFailure}
                    onCheckedChange={(checked) => setSimulateFailure(checked as boolean)}
                  />
                  <Label htmlFor="simulate-failure" className="flex items-center gap-2 cursor-pointer">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    Simulate Processing Failure
                  </Label>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Processing..." : "Send Event"}
                  {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-6 h-6" />
                <span>Aggregated Results</span>
              </CardTitle>
              <CardDescription>Real-time event counts and total amounts aggregated by Client ID.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client ID</TableHead>
                      <TableHead className="text-right">Event Count</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isFetchingData ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : aggregatedData.length > 0 ? (
                      aggregatedData.map((data) => (
                        <TableRow key={data.clientId}>
                          <TableCell className="font-medium">{data.clientId}</TableCell>
                          <TableCell className="text-right">{data.eventCount.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{data.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <Database className="w-8 h-8"/>
                            <span>No data available. Ingest some events to see statistics.</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
             <CardFooter>
                <Button variant="outline" onClick={fetchAggregatedData} disabled={isFetchingData} className="w-full">
                  {isFetchingData ? "Refreshing..." : "Refresh Data"}
                </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}
