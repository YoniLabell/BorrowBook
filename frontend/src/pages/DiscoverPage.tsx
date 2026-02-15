import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";

interface Listing {
  id: number;
  title: string;
  author: string;
  listing_type: string;
  condition: string;
  price?: number;
  status: string;
  distance_km?: number;
  images: { url: string }[];
  created_at: string;
}

export default function DiscoverPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: listings, isLoading } = useQuery<Listing[]>({
    queryKey: ["discover", search, type],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (type) params.set("listing_type", type);
      return apiFetch(`/discovery?${params}`);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(q);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Discover Books</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title, author, or ISBN..."
          className="flex-1 border rounded px-3 py-2"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All</option>
          <option value="LEND">Lend</option>
          <option value="SELL">Sell</option>
        </select>
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Search
        </button>
      </form>

      {isLoading && <p className="text-gray-500">Loading...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings?.map((l) => (
          <Link
            key={l.id}
            to={`/listings/${l.id}`}
            className="bg-white rounded shadow p-4 hover:shadow-md transition"
          >
            {l.images[0] && (
              <img
                src={l.images[0].url}
                alt={l.title}
                className="w-full h-48 object-cover rounded mb-3"
              />
            )}
            {!l.images[0] && (
              <div className="w-full h-48 bg-gray-200 rounded mb-3 flex items-center justify-center text-gray-400">
                No Image
              </div>
            )}
            <h2 className="font-semibold truncate">{l.title}</h2>
            <p className="text-sm text-gray-500">{l.author}</p>
            <div className="flex justify-between items-center mt-2 text-sm">
              <span
                className={`px-2 py-0.5 rounded ${
                  l.listing_type === "LEND"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {l.listing_type}
              </span>
              {l.price && <span className="font-medium">${l.price}</span>}
              {l.distance_km != null && (
                <span className="text-gray-400">{l.distance_km} km</span>
              )}
            </div>
          </Link>
        ))}
      </div>

      {listings?.length === 0 && !isLoading && (
        <p className="text-gray-500 text-center mt-8">
          No listings found. Try a different search.
        </p>
      )}
    </div>
  );
}
