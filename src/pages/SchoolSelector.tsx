import React from "react";
import { useAuth, School } from "../context/AuthContext";
import { Plus, School as SchoolIcon } from "lucide-react";

interface Props {
  onCreateNew: () => void;
}

export const SchoolSelector: React.FC<Props> = ({ onCreateNew }) => {
  const { schools, setSelectedSchool, signOut } = useAuth();

  const handleSelect = (school: School) => {
    setSelectedSchool(school);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-primary px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-2">
            <img src="/Avatar_Porquinho.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tighter text-text-primary font-logo">Selecione a escola</h1>
          <p className="text-text-secondary mt-1 text-sm">Escolha qual escola deseja gerenciar</p>
        </div>

        <div className="bg-surface-secondary rounded-xl p-6 border border-border-primary space-y-3">
          {schools.map((school) => (
            <button
              key={school.id}
              onClick={() => handleSelect(school)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-tertiary border border-border-secondary hover:bg-surface-tertiary/80 hover:border-border-hover transition-all text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-surface-primary border border-border-primary flex items-center justify-center flex-shrink-0">
                <SchoolIcon size={20} className="text-text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-semibold truncate">{school.name}</p>
                <p className="text-text-secondary text-xs uppercase tracking-wider mt-0.5">Ano: {school.year}</p>
              </div>
            </button>
          ))}

          <button
            onClick={onCreateNew}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-dashed border-border-secondary hover:border-border-hover hover:bg-surface-tertiary/50 transition-all cursor-pointer bg-transparent"
          >
            <div className="w-10 h-10 rounded-lg bg-accent-green/10 flex items-center justify-center flex-shrink-0">
              <Plus size={20} className="text-accent-green" />
            </div>
            <p className="text-text-primary font-medium">Criar nova escola</p>
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={signOut}
            className="text-[10px] text-text-secondary hover:text-text-primary uppercase tracking-wider font-semibold transition-colors cursor-pointer bg-transparent border-none"
          >
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
};
