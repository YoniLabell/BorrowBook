import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

interface Conversation {
  id: number;
  transaction_id: number;
  user1_id: number;
  user2_id: number;
  last_message?: { body: string; sender_id: number; created_at: string };
}

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  body: string;
  created_at: string;
}

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [selectedConv, setSelectedConv] = useState<number | null>(null);
  const [newMsg, setNewMsg] = useState("");

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => apiFetch("/chat/conversations"),
  });

  const { data: messages } = useQuery<Message[]>({
    queryKey: ["messages", selectedConv],
    queryFn: () => apiFetch(`/chat/conversations/${selectedConv}/messages`),
    enabled: !!selectedConv,
    refetchInterval: 5000, // Poll every 5s
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      apiFetch(`/chat/conversations/${selectedConv}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      setNewMsg("");
      queryClient.invalidateQueries({ queryKey: ["messages", selectedConv] });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMsg.trim()) sendMutation.mutate(newMsg.trim());
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-10rem)]">
      {/* Conversations list */}
      <div className="w-1/3 bg-white rounded shadow overflow-y-auto">
        <h2 className="p-3 font-semibold border-b">Conversations</h2>
        {conversations?.length === 0 && (
          <p className="p-3 text-sm text-gray-500">No conversations yet.</p>
        )}
        {conversations?.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedConv(c.id)}
            className={`w-full text-left p-3 border-b hover:bg-gray-50 ${
              selectedConv === c.id ? "bg-indigo-50" : ""
            }`}
          >
            <p className="text-sm font-medium">Transaction #{c.transaction_id}</p>
            {c.last_message && (
              <p className="text-xs text-gray-500 truncate">
                {c.last_message.body}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Messages area */}
      <div className="flex-1 bg-white rounded shadow flex flex-col">
        {!selectedConv ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a conversation
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages?.map((m) => (
                <div key={m.id} className="text-sm">
                  <span className="font-medium text-indigo-600">
                    User #{m.sender_id}
                  </span>
                  <span className="text-gray-400 text-xs ml-2">
                    {new Date(m.created_at).toLocaleTimeString()}
                  </span>
                  <p className="mt-0.5">{m.body}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
              <input
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700"
              >
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
