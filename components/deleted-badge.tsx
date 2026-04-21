import { Clock } from "lucide-react";

function timeAgo(ts: unknown): string {
  if (!ts || typeof ts !== "object") return "";
  const secs = (ts as { seconds: number }).seconds;
  if (!secs) return "";
  const diff = Date.now() - secs * 1000;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function DeletedBadge({ deletedAt }: { deletedAt: unknown }) {
  const ago = timeAgo(deletedAt);
  if (!ago) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
      <Clock className="h-3 w-3" />
      Deleted {ago}
    </span>
  );
}
