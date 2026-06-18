import type { BoardColumn } from "../types/order-service.types";

export const boardColumns: BoardColumn[] = [
  {
    status: "ABERTA",
    title: "A fazer",
    description: "Serviços prontos para iniciar",
    className: "border-slate-200 bg-slate-50",
  },
  {
    status: "EM_ANDAMENTO",
    title: "Em execução",
    description: "O que está sendo feito agora",
    className: "border-blue-200 bg-blue-50",
  },
  {
    status: "AGUARDANDO_PECAS",
    title: "Falta peça",
    description: "Parado aguardando material",
    className: "border-amber-200 bg-amber-50",
  },
  {
    status: "IMPEDIDA",
    title: "Pendente",
    description: "Precisa de decisão ou liberação",
    className: "border-red-200 bg-red-50",
  },
];

export const archivedBoardColumns: BoardColumn[] = [
  {
    status: "FINALIZADA",
    title: "Concluído",
    description: "Serviços finalizados",
    className: "border-emerald-200 bg-emerald-50",
  },
  {
    status: "CANCELADA",
    title: "Canceladas",
    description: "Ordens sem execução",
    className: "border-zinc-200 bg-zinc-50",
  },
];