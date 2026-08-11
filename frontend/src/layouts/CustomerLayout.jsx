import React from "react";
import { Outlet } from "react-router-dom";

export function CustomerLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
