"use client";

import { useState } from "react";
import { FileText, Landmark, Receipt, MessageSquare, Users } from "lucide-react";
import { DeclarationsSection } from "@/components/sections/declarations-section";
import { UnionSection } from "@/components/sections/union-section";
import { PayslipsSection } from "@/components/sections/payslips-section";
import { AdminInquiries } from "@/components/admin/admin-inquiries";
import { ClientUsers, type ClientUser } from "@/components/admin/client-users";
import type { DeclarationDTO, UnionDTO, EmployeeDTO, InquiryDTO } from "@/server/queries";

const TABS = [
  { key: "declaraciones", label: "Declaraciones", icon: FileText },
  { key: "sindicatos", label: "Sindicatos", icon: Landmark },
  { key: "recibos", label: "Recibos", icon: Receipt },
  { key: "consultas", label: "Consultas", icon: MessageSquare },
  { key: "accesos", label: "Accesos", icon: Users },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ClientTabs({
  clientId,
  declarations,
  unionItems,
  employees,
  inquiries,
  users,
}: {
  clientId: string;
  declarations: DeclarationDTO[];
  unionItems: UnionDTO[];
  employees: EmployeeDTO[];
  inquiries: InquiryDTO[];
  users: ClientUser[];
}) {
  const [tab, setTab] = useState<TabKey>("declaraciones");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.key ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {tab === "declaraciones" && <DeclarationsSection clientId={clientId} declarations={declarations} />}
      {tab === "sindicatos" && <UnionSection clientId={clientId} items={unionItems} />}
      {tab === "recibos" && <PayslipsSection clientId={clientId} employees={employees} />}
      {tab === "consultas" && <AdminInquiries inquiries={inquiries} />}
      {tab === "accesos" && <ClientUsers clientId={clientId} users={users} />}
    </div>
  );
}
