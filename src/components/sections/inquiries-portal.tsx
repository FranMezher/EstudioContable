"use client";

import { useState, useEffect, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, X, MessageSquare, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Label, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils";
import { createInquiry, type ActionState } from "@/server/actions";
import type { InquiryDTO } from "@/server/queries";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enviando…" : "Enviar consulta"}
    </Button>
  );
}

const statusBadge = {
  OPEN: { tone: "warning" as const, label: "Enviada" },
  ANSWERED: { tone: "success" as const, label: "Respondida" },
  CLOSED: { tone: "neutral" as const, label: "Cerrada" },
};

export function InquiriesPortal({ inquiries }: { inquiries: InquiryDTO[] }) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(createInquiry, {});

  useEffect(() => {
    if (state.ok) setShowForm(false);
  }, [state.ok]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant={showForm ? "secondary" : "primary"} onClick={() => setShowForm((v) => !v)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancelar" : "Nueva consulta"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent>
            <form action={formAction} className="space-y-3">
              {state.error && <p className="text-sm text-red-600">{state.error}</p>}
              <div>
                <Label htmlFor="subject">Asunto</Label>
                <Input id="subject" name="subject" placeholder="Resumen de tu consulta" required />
              </div>
              <div>
                <Label htmlFor="message">Mensaje</Label>
                <Textarea id="message" name="message" placeholder="Contanos en qué te podemos ayudar…" required />
              </div>
              <SubmitBtn />
            </form>
          </CardContent>
        </Card>
      )}

      {inquiries.length === 0 ? (
        <EmptyState title="Sin consultas" description="Cuando envíes una consulta, va a aparecer acá." icon={MessageSquare} />
      ) : (
        <div className="space-y-3">
          {inquiries.map((i) => {
            const sb = statusBadge[i.status];
            return (
              <Card key={i.id}>
                <CardContent>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800">{i.subject}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(i.createdAt)}</p>
                    </div>
                    <Badge tone={sb.tone}>{sb.label}</Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{i.message}</p>
                  {i.response && (
                    <div className="mt-3 rounded-lg bg-emerald-50 p-3">
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Respuesta del estudio
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-emerald-900">{i.response}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
