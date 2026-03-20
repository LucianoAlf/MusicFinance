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
import { Login } from "./pages/Login";
const SchoolSelector = React.lazy(() => import("./pages/SchoolSelector").then(m => ({ default: m.SchoolSelector })));
const CreateSchool = React.lazy(() => import("./pages/CreateSchool").then(m => ({ default: m.CreateSchool })));
import { cn } from "./lib/utils";
import { Loader2 } from "lucide-react";
import { SetPasswordModal, needsPasswordSetup } from "./components/SetPasswordModal";

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-surface-primary">
    <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-4 font-sans uppercase">MF</h1>
    <Loader2 size={24} className="animate-spin text-accent-blue" />
  </div>
);

const ContentSpinner = () => (
  <div className="flex-1 flex items-center justify-center py-32">
    <Loader2 size={24} className="animate-spin text-accent-green" />
  </div>
);

const ErrorScreen = ({ error, onRetry, onLogout }: { error: string; onRetry: () => void; onLogout: () => void }) => (
  <div className="flex-1 flex flex-col items-center justify-center py-32 gap-4">
    <div className="text-accent-red text-lg font-semibold">Erro ao carregar dados</div>
    <p className="text-text-secondary text-sm max-w-md text-center">{error}</p>
    <div className="flex gap-3 mt-2">
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg bg-accent-green/10 text-accent-green border border-accent-green/20 hover:bg-accent-green/20 transition-colors cursor-pointer text-sm font-medium"
      >
        Tentar novamente
      </button>
      <button
        onClick={onLogout}
        className="px-4 py-2 rounded-lg bg-accent-red/10 text-accent-red border border-accent-red/20 hover:bg-accent-red/20 transition-colors cursor-pointer text-sm font-medium"
      >
        Sair
      </button>
    </div>
  </div>
);

const AppContent = () => {
  const { page, dark, dataLoading, dataError, refreshData } = useData();
  const { isSuperadmin, signOut } = useAuth();

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
        {dataLoading ? (
          <ContentSpinner />
        ) : dataError ? (
          <ErrorScreen error={dataError} onRetry={refreshData} onLogout={signOut} />
        ) : (
          <React.Suspense fallback={<ContentSpinner />}>
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
        )}
      </main>
    </div>
  );
};

const AppRouter = () => {
  const { user, session, loading, dataLoaded, selectedSchool, schools, schoolsLoaded, tenantId } = useAuth();
  const [showCreateSchool, setShowCreateSchool] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);

  React.useEffect(() => {
    if (!user) {
      setNeedsPassword(false);
      return;
    }

    const amr = (session as any)?.amr as Array<{ method: string }> | undefined;
    setNeedsPassword(needsPasswordSetup(user.id, amr));
  }, [user, session]);

  // Mostrar loading enquanto:
  // 1. Auth está carregando (loading=true)
  // 2. Ou usuário logado mas dados ainda não carregaram (dataLoaded=false)
  if (loading || (user && !dataLoaded)) {
    return <LoadingScreen />;
  }

  // Usuário não logado → Login
  if (!user) {
    return <Login />;
  }

  if (needsPassword) {
    return (
      <SetPasswordModal
        email={user.email || ""}
        onComplete={() => setNeedsPassword(false)}
      />
    );
  }

  if (selectedSchool) {
    return (
      <DataProvider>
        <AppContent />
      </DataProvider>
    );
  }

  // Usuário logado mas sem escola selecionada
  if (!selectedSchool) {
    // Se existe tenant e as schools ainda não terminaram de carregar em background,
    // manter loading para evitar flash de CreateSchool.
    if (tenantId && !schoolsLoaded && !showCreateSchool) {
      return <LoadingScreen />;
    }

    // Se não tem escolas OU usuário quer criar nova
    if (schools.length === 0 || showCreateSchool) {
      return (
        <React.Suspense fallback={<LoadingScreen />}>
          <CreateSchool onBack={schools.length > 0 ? () => setShowCreateSchool(false) : undefined} />
        </React.Suspense>
      );
    }
    // Tem escolas mas nenhuma selecionada → seletor
    return (
      <React.Suspense fallback={<LoadingScreen />}>
        <SchoolSelector onCreateNew={() => setShowCreateSchool(true)} />
      </React.Suspense>
    );
  }
};

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
