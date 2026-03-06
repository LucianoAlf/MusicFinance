import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DataProvider, useData } from "./context/DataContext";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
const Dashboard = React.lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Professors = React.lazy(() => import("./pages/Professors").then(m => ({ default: m.Professors })));
const Financial = React.lazy(() => import("./pages/Financial").then(m => ({ default: m.Financial })));
const Payables = React.lazy(() => import("./pages/Payables").then(m => ({ default: m.Payables })));
const Dre = React.lazy(() => import("./pages/Dre").then(m => ({ default: m.Dre })));
const Config = React.lazy(() => import("./pages/Config").then(m => ({ default: m.Config })));
const Admin = React.lazy(() => import("./pages/Admin").then(m => ({ default: m.Admin })));
const Login = React.lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const SchoolSelector = React.lazy(() => import("./pages/SchoolSelector").then(m => ({ default: m.SchoolSelector })));
const CreateSchool = React.lazy(() => import("./pages/CreateSchool").then(m => ({ default: m.CreateSchool })));
import { cn } from "./lib/utils";
import { Loader2 } from "lucide-react";

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-surface-primary">
    <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-4 font-sans uppercase">MF</h1>
    <Loader2 size={24} className="animate-spin text-accent-blue" />
  </div>
);

const AppContent = () => {
  const { page, dark } = useData();
  const { isSuperadmin } = useAuth();

  React.useEffect(() => {
    if (dark) {
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
    }
  }, [dark]);

  return (
    <div
      className={cn(
        "h-screen flex overflow-hidden transition-colors duration-300",
        "bg-surface-primary text-text-primary"
      )}
    >
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Header />
        <React.Suspense fallback={<LoadingScreen />}>
          <div className="p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {page === "dash" && <Dashboard />}
            {page === "profs" && <Professors />}
            {page === "monthly" && <Financial />}
            {page === "payables" && <Payables />}
            {page === "dre" && <Dre />}
            {page === "config" && <Config />}
            {page === "admin" && isSuperadmin && <Admin />}
          </div>
        </React.Suspense>
      </main>
    </div>
  );
};

const AppRouter = () => {
  const { user, loading, selectedSchool, schools, tenantId } = useAuth();
  const [showCreateSchool, setShowCreateSchool] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Marcar que o carregamento inicial terminou após um breve delay
  // Isso evita mostrar "Crie sua escola" durante race condition
  React.useEffect(() => {
    if (!loading && user && tenantId !== undefined) {
      const timer = setTimeout(() => setInitialLoadDone(true), 200);
      return () => clearTimeout(timer);
    }
  }, [loading, user, tenantId]);

  if (loading) return <LoadingScreen />;

  if (!user) return (
    <React.Suspense fallback={<LoadingScreen />}>
      <Login />
    </React.Suspense>
  );

  // Aguardar carregamento completo antes de decidir rota
  // Evita mostrar "Crie sua escola" prematuramente
  if (!initialLoadDone && schools.length === 0) {
    return <LoadingScreen />;
  }

  if (!selectedSchool) {
    if (schools.length === 0 || showCreateSchool) {
      return (
        <React.Suspense fallback={<LoadingScreen />}>
          <CreateSchool onBack={schools.length > 0 ? () => setShowCreateSchool(false) : undefined} />
        </React.Suspense>
      );
    }
    return (
      <React.Suspense fallback={<LoadingScreen />}>
        <SchoolSelector onCreateNew={() => setShowCreateSchool(true)} />
      </React.Suspense>
    );
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
