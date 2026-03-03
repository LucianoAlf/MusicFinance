import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const brl = (v: number | null | undefined) =>
  v == null ? "-" : "R$ " + Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const pct = (v: number | null | undefined) =>
  v == null || isNaN(v) ? "-" : (v * 100).toFixed(1) + "%";

export const MS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const MF = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const CCN = ['Pessoal', 'Professores', 'Marketing', 'Eventos', 'Admin', 'Invest', 'Impostos'];
export const CCC = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#6b7280'];
