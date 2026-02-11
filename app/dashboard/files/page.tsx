export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft } from "lucide-react";
import  {DeleteButton } from "@/components/ui/delete-button";

async function getDocuments() {
  try {
    const cookieStore = cookies();
    const cookieHeader = cookieStore.toString();

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/documents`, {
      cache: "no-store",
      headers: {
        cookie: cookieHeader,
      },
    });

    if (!res.ok) throw new Error("Failed");

    const data = await res.json();
    return data.documents || [];
  } catch (error) {
    console.error("FILES FETCH ERROR:", error);
    return null;
  }
}

export default async function FilesPage() {
  const documents = await getDocuments();

  if (documents === null) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold text-destructive">
          Something went wrong ⚠
        </h1>
        <p className="text-muted-foreground">
          Failed to load your files. Please try again.
        </p>

        <Button asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Files Library</h1>

      {documents.length === 0 ? (
        <p className="text-muted-foreground">
          No uploaded files found.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc: any) => (
            <Card key={doc._id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  {doc.name}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {new Date(doc.uploadDate).toLocaleString()}
                </p>

                <div className="flex justify-between">
                  <a
                    href={doc.fileUrl || doc.filePath}
                    target="_blank"
                    className="text-sm text-primary underline"
                  >
                    View
                  </a>

                  <DeleteButton id={doc._id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
