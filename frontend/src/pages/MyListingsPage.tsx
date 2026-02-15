import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";

interface Listing {
  id: number;
  title: string;
  author: string;
  listing_type: string;
  status: string;
  created_at: string;
}

export default function MyListingsPage() {
  const { data: listings, isLoading } = useQuery<Listing[]>({
    queryKey: ["my-listings"],
    queryFn: () => apiFetch("/listings"),
  });

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Listings</h1>
        <Link
          to="/create"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm"
        >
          + New Listing
        </Link>
      </div>

      {listings?.length === 0 && (
        <p className="text-gray-500">No listings yet.</p>
      )}

      <div className="space-y-3">
        {listings?.map((l) => (
          <Link
            key={l.id}
            to={`/listings/${l.id}`}
            className="block bg-white rounded shadow p-4 hover:shadow-md"
          >
            <div className="flex justify-between">
              <div>
                <h2 className="font-semibold">{l.title}</h2>
                <p className="text-sm text-gray-500">{l.author}</p>
              </div>
              <div className="flex gap-2 text-sm">
                <span
                  className={`px-2 py-0.5 rounded ${
                    l.listing_type === "LEND"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {l.listing_type}
                </span>
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                  {l.status}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
