import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

interface Request {
  id: number;
  listing_id: number;
  requester_id: number;
  owner_id: number;
  status: string;
  message?: string;
  proposed_meeting_area?: string;
  created_at: string;
}

export default function RequestsPage() {
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery<Request[]>({
    queryKey: ["requests"],
    queryFn: () => apiFetch("/requests"),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/requests/${id}/accept`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["requests"] }),
  });

  const declineMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/requests/${id}/decline`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["requests"] }),
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Requests</h1>

      {requests?.length === 0 && (
        <p className="text-gray-500">No requests.</p>
      )}

      <div className="space-y-3">
        {requests?.map((r) => (
          <div key={r.id} className="bg-white rounded shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">
                  Request #{r.id} for listing #{r.listing_id}
                </p>
                {r.message && <p className="mt-1 text-sm">{r.message}</p>}
                {r.proposed_meeting_area && (
                  <p className="text-sm text-gray-500">
                    Meeting: {r.proposed_meeting_area}
                  </p>
                )}
              </div>
              <span
                className={`px-2 py-0.5 rounded text-sm ${
                  r.status === "PENDING"
                    ? "bg-yellow-100 text-yellow-700"
                    : r.status === "ACCEPTED"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {r.status}
              </span>
            </div>

            {r.status === "PENDING" && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => acceptMutation.mutate(r.id)}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Accept
                </button>
                <button
                  onClick={() => declineMutation.mutate(r.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
