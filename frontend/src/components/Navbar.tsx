import { Link } from "react-router-dom";

interface User {
  id: number;
  display_name: string;
}

export default function Navbar({
  user,
  onLogout,
}: {
  user: User | null;
  onLogout: () => void;
}) {
  return (
    <nav className="bg-white shadow">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="text-xl font-bold text-indigo-600">
          BorrowBook
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/" className="hover:text-indigo-600">
            Discover
          </Link>
          {user ? (
            <>
              <Link to="/create" className="hover:text-indigo-600">
                + Listing
              </Link>
              <Link to="/my-listings" className="hover:text-indigo-600">
                My Books
              </Link>
              <Link to="/requests" className="hover:text-indigo-600">
                Requests
              </Link>
              <Link to="/chat" className="hover:text-indigo-600">
                Chat
              </Link>
              <Link to="/notifications" className="hover:text-indigo-600">
                Notifs
              </Link>
              <Link to="/profile" className="hover:text-indigo-600">
                {user.display_name}
              </Link>
              <button
                onClick={onLogout}
                className="text-red-500 hover:text-red-700"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-indigo-600">
                Login
              </Link>
              <Link
                to="/register"
                className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
