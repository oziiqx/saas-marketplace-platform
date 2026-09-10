"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitReviewAction } from "@/server/actions/products";

export function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const submit = () => {
    startTransition(async () => {
      const r = await submitReviewAction({ productId, rating, title, body });
      if (r.ok) {
        toast.success(r.message ?? "Review saved");
        setTitle("");
        setBody("");
        router.refresh();
      } else toast.error(r.error);
    });
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium">Write a review</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onMouseEnter={() => setHover(value)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(value)}
          >
            <Star
              className={cn(
                "size-6 transition-colors",
                (hover || rating) >= value ? "fill-warning text-warning" : "text-muted-foreground",
              )}
            />
          </button>
        ))}
      </div>
      <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea
        placeholder="What did you think?"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Button size="sm" onClick={submit} disabled={pending || rating === 0}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Submit review
      </Button>
    </div>
  );
}
