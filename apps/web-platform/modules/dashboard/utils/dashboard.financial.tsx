import { decimalToNumber } from "@/lib/finance/decimalToNumber";
import type { FinancialAccountStatus, FinancialAccountType } from "@prisma/client";

export function financialAmountDashboard(
  groups: Array<{
    type: FinancialAccountType;
    status: FinancialAccountStatus;
    _sum?: { amount?: unknown } | null;
  }>,
  type: FinancialAccountType
) {
  return groups
    .filter(
      (group) =>
        group.type === type &&
        (group.status === "ABERTA" || group.status === "VENCIDA")
    )
    .reduce((total, group) => total + decimalToNumber(group._sum?.amount), 0);
}