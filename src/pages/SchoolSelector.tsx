import React from "react";
import { useAuth, School } from "../context/AuthContext";
import { Music, Plus, School as SchoolIcon } from "lucide-react";

interface Props {
  onCreateNew: () => void;
}

export const SchoolSelector: React.FC<Props> = ({ onCreateNew }) => {
  const { schools, setSelectedSchool, signOut } = useAuth();

  const handleSelect = (school: School) => {
    setSelectedSchool(school);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 mb-4">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Selecione a escola</h1>
          <p className="text-slate-400 mt-1 text-sm">Escolha qual escola deseja gerenciar</p>
        </div>

        <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-700/50 space-y-3">
          {schools.map((school) => (
            <button
              key={school.id}
              onClick={() => handleSelect(school)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-700/30 border border-slate-600/30 hover:bg-slate-700/60 hover:border-violet-500/30 transition-all text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <SchoolIcon size={20} className="text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{school.name}</p>
                <p className="text-slate-400 text-sm">Ano: {school.year}</p>
              </div>
            </button>
          ))}

          <button
            onClick={onCreateNew}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-dashed border-slate-600/50 hover:border-violet-500/30 hover:bg-slate-700/20 transition-all cursor-pointer bg-transparent"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Plus size={20} className="text-emerald-400" />
            </div>
            <p className="text-slate-300 font-medium">Criar nova escola</p>
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={signOut}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer bg-transparent border-none"
          >
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
};
