"use client";

import { useState, useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { MessageSquare, CheckCircle2, Reply } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";
import { respondInquiry, type ActionState } from "@/server/actions";
import type { InquiryDTO } from "@/server/queries";

type Item = InquiryDTO & { clientName?: string };

const statusBadge = {
  OPEN: { tone: "warning" as const, label: "Sin responder" },
  ANSWERED: { tone: "success" as const, label: "Respondida" },
  CLOSED: { tone: "neutral" as const, label: "Cerrada" },
};

function RespondBtn() {
  const { pending } = useFormStatus();
  return (
    <Button size="sm" type="submit" disabled={pending}>
      <Reply className="h-4 w-4" /> {pending ? "Enviando…" : "Responder"}
    </Button>
  );
}

function InquiryCard({ inquiry }: { inquiry: Item }) {
  const [show, setShow] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(respondInquiry, {});
  const sb = statusBadge[inquiry.status];

  useEffect(() => {
    if (state.ok) setShow(false);
  }, [state.ok]);

  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div>
            {inquiry.clientName && (
              <p className="text-xs font-semibold text-brand-600">{inquiry.clientName}</p>
            )}
            <p className="font-medium text-slate-800">{inquiry.subject}</p>
            <p className="text-xs text-slate-400">{formatDateTime(inquiry.createdAt)}</p>
          </div>
          <Badge tone={sb.tone}>{sb.label}</Badge>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{inquiry.message}</p>

        {inquiry.response && (
          <div className="mt-3 rounded-lg bg-emerald-50 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Tu respuesta
            </p>
            <p className="whitespace-pre-wrap text-sm text-emerald-900">{inquiry.response}</p>
          </div>
        )}

        {!show && inquiry.status === "OPEN" && (
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => setShow(true)}>
              <Reply className="h-4 w-4" /> Responder
            </Button>
          </div>
        )}
        {!show && inquiry.status === "ANSWERED" && (
          <div className="mt-3">
            <Button size="sm" variant="ghost" onClick={() => setShow(true)}>
              Editar respuesta
            </Button>
          </div>
        )}

        {show && (
          <form action={formAction} className="mt-3 space-y-2">
            <input type="hidden" name="id" value={inquiry.id} />
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <Textarea name="response" defaultValue={inquiry.response ?? ""} placeholder="Escribí la respuesta…" required />
            <div className="flex gap-2">
              <RespondBtn />
              <Button size="sm" variant="ghost" type="button" onClick={() => setShow(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminInquiries({ inquiries }: { inquiries: Item[] }) {
  if (inquiries.length === 0) {
    return <EmptyState title="Sin consultas" description="No hay consultas para mostrar." icon={MessageSquare} />;
  }
  return (
    <div className="space-y-3">
      {inquiries.map((i) => (
        <InquiryCard key={i.id} inquiry={i} />
      ))}
    </div>
  );
}
