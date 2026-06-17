import { prisma } from "@/lib/prisma";

export type DeclarationDTO = {
  id: string;
  type: "IVA" | "IIBB" | "GANANCIAS" | "BALANCES";
  periodMonth: number | null;
  periodYear: number;
  fileUrl: string;
  fileName: string;
  notes: string | null;
  uploadedRole: "ADMIN" | "CLIENT";
  createdAt: string;
};

export type UnionDTO = {
  id: string;
  title: string;
  description: string | null;
  periodMonth: number | null;
  periodYear: number;
  amount: number | null;
  fileUrl: string | null;
  fileName: string | null;
  isPaid: boolean;
  paidAt: string | null;
  createdAt: string;
};

export type EmployeeDTO = {
  id: string;
  name: string;
  cuil: string | null;
  position: string | null;
  payslips: {
    id: string;
    periodMonth: number;
    periodYear: number;
    fileUrl: string;
    fileName: string;
    netAmount: number | null;
    createdAt: string;
  }[];
};

export type InquiryDTO = {
  id: string;
  subject: string;
  message: string;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  response: string | null;
  respondedAt: string | null;
  createdAt: string;
};

export async function getDeclarations(clientId: string): Promise<DeclarationDTO[]> {
  const rows = await prisma.declaration.findMany({
    where: { clientId },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((d) => ({
    id: d.id,
    type: d.type,
    periodMonth: d.periodMonth,
    periodYear: d.periodYear,
    fileUrl: d.fileUrl,
    fileName: d.fileName,
    notes: d.notes,
    uploadedRole: d.uploadedRole,
    createdAt: d.createdAt.toISOString(),
  }));
}

export async function getUnionItems(clientId: string): Promise<UnionDTO[]> {
  const rows = await prisma.unionItem.findMany({
    where: { clientId },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((u) => ({
    id: u.id,
    title: u.title,
    description: u.description,
    periodMonth: u.periodMonth,
    periodYear: u.periodYear,
    amount: u.amount ? Number(u.amount) : null,
    fileUrl: u.fileUrl,
    fileName: u.fileName,
    isPaid: u.isPaid,
    paidAt: u.paidAt ? u.paidAt.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function getEmployees(clientId: string): Promise<EmployeeDTO[]> {
  const rows = await prisma.employee.findMany({
    where: { clientId },
    orderBy: { name: "asc" },
    include: {
      payslips: {
        orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      },
    },
  });
  return rows.map((e) => ({
    id: e.id,
    name: e.name,
    cuil: e.cuil,
    position: e.position,
    payslips: e.payslips.map((p) => ({
      id: p.id,
      periodMonth: p.periodMonth,
      periodYear: p.periodYear,
      fileUrl: p.fileUrl,
      fileName: p.fileName,
      netAmount: p.netAmount ? Number(p.netAmount) : null,
      createdAt: p.createdAt.toISOString(),
    })),
  }));
}

export async function getInquiries(clientId: string): Promise<InquiryDTO[]> {
  const rows = await prisma.inquiry.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((i) => ({
    id: i.id,
    subject: i.subject,
    message: i.message,
    status: i.status,
    response: i.response,
    respondedAt: i.respondedAt ? i.respondedAt.toISOString() : null,
    createdAt: i.createdAt.toISOString(),
  }));
}
