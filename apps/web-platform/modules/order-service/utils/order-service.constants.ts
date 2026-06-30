import type { BoardColumn } from "../types/order-service.types";

export const boardColumns: BoardColumn[] = [
  {
    status: "ABERTA",
    title: "A fazer",
    description: "Serviços prontos para iniciar",
    className: "",
  },
  {
    status: "EM_ANDAMENTO",
    title: "Em execução",
    description: "O que está sendo feito agora",
    className: "",
  },
  {
    status: "AGUARDANDO_PECAS",
    title: "Falta peça",
    description: "Parado aguardando material",
    className: "",
  },
  {
    status: "IMPEDIDA",
    title: "Pendente",
    description: "Precisa de decisão ou liberação",
    className: "",
  },
];

export const archivedBoardColumns: BoardColumn[] = [
  {
    status: "FINALIZADA",
    title: "Veículo liberado",
    description: "Serviços finalizados",
    className: "",
  },
  {
    status: "CANCELADA",
    title: "Canceladas",
    description: "Ordens sem execução",
    className: "",
  },
];
