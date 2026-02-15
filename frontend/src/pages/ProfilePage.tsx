import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../api/client";

interface User {
  id: number;
  display_name: string;
  avatar_url?: string;
  about?: string;
  latitude?: number;
  longitude?: number;
}

export default function ProfilePage({ user }: { user: User }) {
  const [form, setForm] = useState({
    display_name: user.display_name,
    about: user.about || "",
  });
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiFetch("/users/me", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => setSaved(true),
  });

  const handleSave = () => {
    setSaved(false);
    updateMutation.mutate(form);
  };

  const handleSetLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateMutation.mutate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Display Name
          </label>
          <input
            value={form.display_name}
            onChange={(e) =>
              setForm({ ...form, display_name: e.target.value })
            }
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">About</label>
          <textarea
            value={form.about}
            onChange={(e) => setForm({ ...form, about: e.target.value })}
            rows={3}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
        >
          Save Profile
        </button>

        {saved && (
          <p className="text-green-600 text-sm text-center">Saved!</p>
        )}

        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-2">Location</h3>
          <p className="text-sm text-gray-500 mb-2">
            {user.latitude && user.longitude
              ? `Current: ${user.latitude.toFixed(2)}, ${user.longitude.toFixed(2)}`
              : "Not set"}
          </p>
          <button
            onClick={handleSetLocation}
            disabled={locating}
            className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-gray-900 disabled:opacity-50"
          >
            {locating ? "Getting location..." : "Update My Location"}
          </button>
        </div>
      </div>
    </div>
  );
}
