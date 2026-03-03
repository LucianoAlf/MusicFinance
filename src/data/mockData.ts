import { DashboardData, Professor, Student, PayableBill } from "../types";

export function genData(): DashboardData {
  const nm = [
    "Carlos Silva|Guitarra", "Marina Costa|Piano", "Rafael Santos|Violão", "Patrícia Oliveira|Canto",
    "Fernando Almeida|Bateria", "Juliana Souza|Violino", "André Pereira|Guitarra", "Camila Lima|Baixo",
    "Roberto Ferreira|Teclado", "Luciana Mendes|Flauta", "Diego Barbosa|Saxofone", "Tatiane Rocha|Violão",
    "Marcelo Dias|Canto", "Aline Martins|Bateria", "Gustavo Ribeiro|Piano", "Renata Cardoso|Guitarra",
    "Bruno Araújo|Violino", "Amanda Correia|Percussão", "Lucas Gomes|Ukulele", "Vanessa Teixeira|Teclado"
  ];
  const co = [130, 110, 100, 120, 140, 115, 130, 100, 105, 100, 120, 100, 120, 140, 110, 130, 115, 110, 100, 105];
  const ns = [12, 10, 11, 9, 8, 10, 9, 11, 8, 10, 9, 10, 8, 9, 10, 8, 9, 10, 9, 8];
  let si = 0;
  
  const ps: Professor[] = nm.map((s, i) => {
    const [n, inst] = s.split("|");
    const sts: Student[] = Array.from({ length: ns[i] }, (_, j) => {
      const pv = [290, 315, 350, 358, 358, 358][Math.floor(Math.random() * 6)];
      const sm = Math.floor(Math.random() * 3);
      const pays = Array.from({ length: 12 }, (_, m) => (m < sm ? null : Math.random() < 0.08 ? 0 : pv));
      si++;
      return {
        id: "s" + i + "-" + j,
        name: "Aluno " + si,
        situation: "Ativo",
        hour: ["08:00", "09:00", "10:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"][j % 9],
        day: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab"][j % 6],
        payments: pays
      };
    });
    return { id: "p" + i, name: n, instrument: inst, costPerStudent: co[i], students: sts };
  });

  const year = 2026;
  const currentMonth = new Date().getMonth();
  const payableBills: PayableBill[] = [];

  const addBill = (desc: string, ccId: string, eiId: string, type: any, amount: number, day: number) => {
    for (let i = 0; i < 12; i++) {
      payableBills.push({
        id: `bill-${eiId}-${i}`,
        description: desc,
        costCenterId: ccId,
        expenseItemId: eiId,
        type,
        amount,
        dueDate: `${year}-${String(i + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        status: i < currentMonth ? "PAID" : "PENDING",
        groupId: `grp-${eiId}`,
      });
    }
  };

  addBill("Auxiliar Adm.", "cc0", "ei0-0", "RECURRENT_FIXED", 1200, 5);
  addBill("Recepcionista", "cc0", "ei0-1", "RECURRENT_FIXED", 1600, 5);
  addBill("Pro-Labore", "cc0", "ei0-2", "RECURRENT_FIXED", 3000, 10);
  addBill("Aluguel", "cc4", "ei4-0", "RECURRENT_FIXED", 2200, 15);
  addBill("Conta de Energia", "cc4", "ei4-1", "RECURRENT_VARIABLE", 350, 20);
  addBill("Internet", "cc4", "ei4-2", "RECURRENT_FIXED", 150, 10);
  addBill("Emusys", "cc4", "ei4-3", "RECURRENT_FIXED", 240, 5);
  addBill("Contabilidade", "cc6", "ei6-3", "RECURRENT_FIXED", 350, 25);

  for (let i = 0; i < 3; i++) {
      payableBills.push({
        id: `bill-inst-${i}`,
        description: `Compra de Equipamento (${i + 1}/3)`,
        costCenterId: "cc4",
        expenseItemId: "ei4-4",
        type: "INSTALLMENT",
        amount: 50,
        dueDate: `${year}-${String(i + 1).padStart(2, "0")}-12`,
        status: i < currentMonth ? "PAID" : "PENDING",
        groupId: "grp-inst",
        totalInstallments: 3,
        currentInstallment: i + 1,
      });
  }

  return {
    config: { schoolName: "Escola Modelo", year, tuition: 358, passport: 350 },
    professors: ps,
    expenses: [
      { id: "cc0", name: "Pessoal", color: "#6366f1", items: [{ id: "ei0-0", name: "Auxiliar Adm.", type: "F", amounts: Array(12).fill(1200) }, { id: "ei0-1", name: "Recepcionista", type: "F", amounts: Array(12).fill(1600) }, { id: "ei0-2", name: "Pro-Labore", type: "F", amounts: Array(12).fill(3000) }] },
      { id: "cc1", name: "Professores", color: "#8b5cf6", items: [{ id: "ei1-0", name: "VT Professores", type: "F", amounts: Array(12).fill(120) }] },
      { id: "cc2", name: "Marketing", color: "#f59e0b", items: [{ id: "ei2-0", name: "Marketing Digital", type: "F", amounts: Array(12).fill(800) }, { id: "ei2-1", name: "Tráfego Pago", type: "V", amounts: Array(12).fill(600) }] },
      { id: "cc3", name: "Eventos", color: "#10b981", items: [{ id: "ei3-0", name: "Eventos", type: "V", amounts: Array(12).fill(0) }] },
      { id: "cc4", name: "Admin", color: "#3b82f6", items: [{ id: "ei4-0", name: "Aluguel", type: "F", amounts: Array(12).fill(2200) }, { id: "ei4-1", name: "Energia", type: "F", amounts: Array(12).fill(350) }, { id: "ei4-2", name: "Internet", type: "F", amounts: Array(12).fill(150) }, { id: "ei4-3", name: "Emusys", type: "F", amounts: Array(12).fill(240) }, { id: "ei4-4", name: "Material", type: "V", amounts: [50, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0] }] },
      { id: "cc5", name: "Invest", color: "#ef4444", items: [{ id: "ei5-0", name: "Mentoria", type: "V", amounts: Array(12).fill(0) }] },
      { id: "cc6", name: "Impostos", color: "#6b7280", items: [{ id: "ei6-0", name: "Tarifas Banc.", type: "F", amounts: Array(12).fill(50) }, { id: "ei6-1", name: "Taxa Cartões", type: "V", amounts: Array(12).fill(120) }, { id: "ei6-2", name: "DAS/Simples", type: "F", amounts: Array(12).fill(300) }, { id: "ei6-3", name: "Contabilidade", type: "F", amounts: Array(12).fill(350) }] }
    ],
    revenue: {
      enrollments: Array.from({ length: 12 }, (_, m) => (m < 3 ? 700 : 350)),
      shop: Array(12).fill(0),
      events: Array(12).fill(0),
      interest: Array.from({ length: 12 }, () => Math.floor(Math.random() * 70)),
      other: Array(12).fill(0)
    },
    payableBills
  };
}
