import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div className="fixed top-[-20%] end-[-10%] w-[50vw] h-[50vw] rounded-full bg-[var(--color-oxygen-500)] blur-[180px] opacity-[0.03] pointer-events-none" />
      <Sidebar />
      <div className="flex-1 ms-[280px] bg-[var(--bg-page)] relative flex flex-col">
        <Topbar />
        <div className="flex-1 pt-20 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
