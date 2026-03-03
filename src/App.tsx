/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { DataProvider, useData } from "./context/DataContext";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./pages/Dashboard";
import { Professors } from "./pages/Professors";
import { Financial } from "./pages/Financial";
import { Payables } from "./pages/Payables";
import { Dre } from "./pages/Dre";
import { Config } from "./pages/Config";
import { cn } from "./lib/utils";

const AppContent = () => {
  const { page, dark } = useData();

  return (
    <div
      className={cn(
        "h-screen flex overflow-hidden transition-colors duration-300",
        dark ? "bg-slate-900" : "bg-slate-50"
      )}
    >
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header />
        <div className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {page === "dash" && <Dashboard />}
          {page === "profs" && <Professors />}
          {page === "monthly" && <Financial />}
          {page === "payables" && <Payables />}
          {page === "dre" && <Dre />}
          {page === "config" && <Config />}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

