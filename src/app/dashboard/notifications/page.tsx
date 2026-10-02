"use client";
import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const reload = () => {
    fetch("/api/notifications")
      .then(r => r.json())
      .then(d => {
        setItems(d?.notifications || []);
        setUnread(d?.unread || 0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const markAll = async () => {
    const res = await fetch("/api/notifications", { method: "PATCH" });
    if (res.ok) {
      setItems(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } else {
      toast("Could not update", "error");
    }
  };

  const markOne = async (id: string) => {
    const res = await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, { method: "PATCH" });
    if (res.ok) {
      setItems(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
      setUnread(u => Math.max(0, u - 1));
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>
            <CheckCheck className="h-4 w-4 mr-1.5" /> Mark all read
          </Button>
        )}
      </div>
      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-12 w-12" />}
          title="No notifications yet"
          description="Payment results, membership activations and reveal confirmations land here."
        />
      ) : (
        <div className="space-y-3">
          {items.map((n: any) => (
            <Card key={n.id} className={n.read ? "opacity-70" : ""}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{n.title}</p>
                    {!n.read && <Badge variant="success">new</Badge>}
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {n.createdAt ? new Date(n.createdAt).toLocaleString("en-RW") : ""}
                  </p>
                </div>
                {!n.read && (
                  <Button variant="outline" size="sm" onClick={() => markOne(n.id)}>
                    Mark read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
