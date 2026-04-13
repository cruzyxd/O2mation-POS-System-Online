import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth.store";

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="p-8">
      <div className="flex flex-col gap-4 items-start">
        <h1 className="text-3xl font-bold font-[var(--font-heading)] tracking-tight text-[var(--fg-heading)]">Dashboard</h1>
        <p className="text-[var(--fg-muted)]">Welcome, <strong>{user?.username}</strong> ({user?.role})</p>
        <button
          onClick={() => void handleSignOut()}
          className="px-4 py-2 bg-[var(--color-oxygen-500)] text-white rounded-lg hover:bg-[var(--color-oxygen-600)] transition-colors text-sm font-semibold"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
