"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteButton({ id }: { id: string }) {
  async function handleDelete() {
    const confirmed = confirm("Delete this file?");
    if (!confirmed) return;

    const res = await fetch(`/api/documents?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      window.location.reload();
    } else {
      alert("Delete failed");
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
    >
      <Trash2 className="h-4 w-4 mr-1" />
      Delete
    </Button>
  );
}
