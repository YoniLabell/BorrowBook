import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

interface Listing {
  id: number;
  owner_id: number;
  title: string;
  author: string;
  isbn?: string;
  language?: string;
  category?: string;
  listing_type: string;
  condition: string;
  description?: string;
  price?: number;
  max_lend_days?: number;
  deposit_amount?: number;
  status: string;
  images: { url: string }[];
  created_at: string;
}

interface User {
  id: number;
}

export default function ListingDetailPage({ user }: { user: User | null }) {
  const { id } = useParams();
  const [msg, setMsg] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState("");

  const { data: listing, isLoading } = useQuery<Listing>({
    queryKey: ["listing", id],
    queryFn: () => apiFetch(`/listings/${id}`),
  });

  const handleRequest = async () => {
    setRequesting(true);
    setError("");
    try {
      await apiFetch("/requests", {
        method: "POST",
        body: JSON.stringify({ listing_id: Number(id), message: msg }),
      });
      setRequestSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRequesting(false);
    }
  };

  if (isLoading) return <p>Loading...</p>;
  if (!listing) return <p>Listing not found</p>;

  const isOwner = user?.id === listing.owner_id;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded shadow p-6">
        {listing.images[0] && (
          <img
            src={listing.images[0].url}
            alt={listing.title}
            className="w-full max-h-96 object-contain rounded mb-4"
          />
        )}

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{listing.title}</h1>
            <p className="text-gray-600">by {listing.author}</p>
          </div>
          <span
            className={`px-3 py-1 rounded text-sm font-medium ${
              listing.listing_type === "LEND"
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {listing.listing_type}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <span className="font-medium">Condition:</span> {listing.condition}
          </div>
          <div>
            <span className="font-medium">Status:</span> {listing.status}
          </div>
          {listing.isbn && (
            <div>
              <span className="font-medium">ISBN:</span> {listing.isbn}
            </div>
          )}
          {listing.language && (
            <div>
              <span className="font-medium">Language:</span> {listing.language}
            </div>
          )}
          {listing.category && (
            <div>
              <span className="font-medium">Category:</span> {listing.category}
            </div>
          )}
          {listing.price != null && (
            <div>
              <span className="font-medium">Price:</span> ${listing.price}
            </div>
          )}
          {listing.max_lend_days != null && (
            <div>
              <span className="font-medium">Max Lend Days:</span>{" "}
              {listing.max_lend_days}
            </div>
          )}
        </div>

        {listing.description && (
          <div className="mt-4">
            <h3 className="font-medium mb-1">Description</h3>
            <p className="text-gray-600 text-sm">{listing.description}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mt-4">
            {error}
          </div>
        )}

        {user &&
          !isOwner &&
          listing.status === "AVAILABLE" &&
          !requestSent && (
            <div className="mt-6 border-t pt-4">
              <h3 className="font-medium mb-2">Send a Request</h3>
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Add a message (optional)..."
                rows={2}
                className="w-full border rounded px-3 py-2 mb-2 text-sm"
              />
              <button
                onClick={handleRequest}
                disabled={requesting}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {requesting
                  ? "Sending..."
                  : listing.listing_type === "LEND"
                  ? "Request to Borrow"
                  : "Request to Buy"}
              </button>
            </div>
          )}

        {requestSent && (
          <div className="mt-4 bg-green-100 text-green-700 p-3 rounded">
            Request sent! The owner will review it.
          </div>
        )}
      </div>
    </div>
  );
}
