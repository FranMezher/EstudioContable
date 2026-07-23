"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deletePayslip } from "@/server/actions";

export function DeletePayslipButton({ payslipId, label }: { payslipId: string; label: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        title="Eliminar recibo"
        disabled={isPending}
        onClick={() => {
          if (!confirm(`¿Eliminar el recibo de ${label}? No se puede deshacer.`)) return;
          startTransition(async () => {
            const res = await deletePayslip(payslipId);
            if (res.error) setError(res.error);
          });
        }}
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </>
  );
}
