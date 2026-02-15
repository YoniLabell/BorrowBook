import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

interface Notification {
  id: number;
  type: string;
  payload?: string;
  read_at?: string;
  created_at: string;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => apiFetch("/notifications"),
  });

  const markAllRead = useMutation({
    mutationFn: () => apiFetch("/notifications/read-all", { method: "POST" }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button
          onClick={() => markAllRead.mutate()}
          className="text-sm text-indigo-600 hover:underline"
        >
          Mark all as read
        </button>
      </div>

      {notifications?.length === 0 && (
        <p className="text-gray-500">No notifications.</p>
      )}

      <div className="space-y-2">
        {notifications?.map((n) => (
          <div
            key={n.id}
            className={`bg-white rounded shadow p-4 ${
              !n.read_at ? "border-l-4 border-indigo-500" : ""
            }`}
          >
            <div className="flex justify-between">
              <span className="text-sm font-medium">
                {n.type.replace(/_/g, " ")}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(n.created_at).toLocaleString()}
              </span>
            </div>
            {n.payload && (
              <p className="text-sm text-gray-600 mt-1">
                {(() => {
                  try {
                    const p = JSON.parse(n.payload);
                    return Object.entries(p)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ");
                  } catch {
                    return n.payload;
                  }
                })()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
