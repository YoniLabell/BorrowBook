import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";

export default function CreateListingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    listing_type: "LEND",
    title: "",
    author: "",
    isbn: "",
    language: "",
    category: "",
    condition: "GOOD",
    description: "",
    price: "",
    max_lend_days: "",
    deposit_amount: "",
  });
  const [detectUrl, setDetectUrl] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleDetect = async () => {
    if (!detectUrl) return;
    setDetecting(true);
    try {
      const result = await apiFetch(
        `/books/detect?image_url=${encodeURIComponent(detectUrl)}`
      );
      if (result.detected_title) setForm((f) => ({ ...f, title: result.detected_title }));
      if (result.detected_author) setForm((f) => ({ ...f, author: result.detected_author }));
      if (result.detected_isbn) setForm((f) => ({ ...f, isbn: result.detected_isbn }));
    } catch (err: any) {
      setError("Detection failed: " + err.message);
    } finally {
      setDetecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload: any = {
        ...form,
        price: form.price ? parseFloat(form.price) : undefined,
        max_lend_days: form.max_lend_days
          ? parseInt(form.max_lend_days)
          : undefined,
        deposit_amount: form.deposit_amount
          ? parseFloat(form.deposit_amount)
          : undefined,
        image_urls: detectUrl ? [detectUrl] : [],
      };
      // Clean empty strings
      for (const key of Object.keys(payload)) {
        if (payload[key] === "") delete payload[key];
      }
      const listing = await apiFetch("/listings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      navigate(`/listings/${listing.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Listing</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>
      )}

      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="font-semibold mb-2">Auto-Detect from Image</h2>
        <p className="text-sm text-gray-500 mb-2">
          Paste a public URL of the book cover to auto-fill title, author, and
          ISBN.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={detectUrl}
            onChange={(e) => setDetectUrl(e.target.value)}
            placeholder="https://example.com/book-cover.jpg"
            className="flex-1 border rounded px-3 py-2 text-sm"
          />
          <button
            onClick={handleDetect}
            disabled={detecting || !detectUrl}
            className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900 disabled:opacity-50"
          >
            {detecting ? "Detecting..." : "Detect"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              name="listing_type"
              value={form.listing_type}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            >
              <option value="LEND">Lend</option>
              <option value="SELL">Sell</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Condition</label>
            <select
              name="condition"
              value={form.condition}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            >
              <option value="NEW">New</option>
              <option value="LIKE_NEW">Like New</option>
              <option value="GOOD">Good</option>
              <option value="FAIR">Fair</option>
              <option value="POOR">Poor</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Author *</label>
          <input
            name="author"
            value={form.author}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">ISBN</label>
            <input
              name="isbn"
              value={form.isbn}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Language</label>
            <input
              name="language"
              value={form.language}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <input
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {form.listing_type === "SELL" && (
          <div>
            <label className="block text-sm font-medium mb-1">Price *</label>
            <input
              name="price"
              type="number"
              step="0.01"
              value={form.price}
              onChange={handleChange}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>
        )}

        {form.listing_type === "LEND" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Max Lend Days
              </label>
              <input
                name="max_lend_days"
                type="number"
                value={form.max_lend_days}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Deposit Amount
              </label>
              <input
                name="deposit_amount"
                type="number"
                step="0.01"
                value={form.deposit_amount}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create Listing"}
        </button>
      </form>
    </div>
  );
}
