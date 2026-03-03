import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DataProvider, useData } from "./context/DataContext";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./pages/Dashboard";
import { Professors } from "./pages/Professors";
import { Financial } from "./pages/Financial";
import { Payables } from "./pages/Payables";
import { Dre } from "./pages/Dre";
import { Config } from "./pages/Config";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { SchoolSelector } from "./pages/SchoolSelector";
import { CreateSchool } from "./pages/CreateSchool";
import { cn } from "./lib/utils";
import { Loader2, Music } from "lucide-react";

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

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 mb-4">
      <Music className="w-8 h-8 text-white" />
    </div>
    <Loader2 size={24} className="animate-spin text-violet-400 mt-4" />
  </div>
);

const AuthPages = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  if (mode === "signup") return <Signup onGoToLogin={() => setMode("login")} />;
  return <Login onGoToSignup={() => setMode("signup")} />;
};

const AppRouter = () => {
  const { user, loading, selectedSchool, schools } = useAuth();
  const [showCreateSchool, setShowCreateSchool] = useState(false);

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthPages />;

  if (!selectedSchool) {
    if (schools.length === 0 || showCreateSchool) {
      return <CreateSchool onBack={schools.length > 0 ? () => setShowCreateSchool(false) : undefined} />;
    }
    return <SchoolSelector onCreateNew={() => setShowCreateSchool(true)} />;
  }

  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
