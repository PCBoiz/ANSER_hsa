import { NextResponse } from "next/server";
import { isN8nApiConfigured, listN8nExecutions } from "@/server/n8nApi";
import { yeuCauVaiTro } from "@/server/session";
import { timQuyTac } from "@/server/store/automation";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await yeuCauVaiTro("ke_toan"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }

  const quyTac = await timQuyTac((await params).id);
  if (!quyTac) return NextResponse.json({ message: "Không tìm thấy quy tắc." }, { status: 404 });
  if (!quyTac.n8nWorkflowId) {
    return NextResponse.json({ message: "Quy tắc chưa liên kết workflow n8n nào." }, { status: 400 });
  }
  if (!isN8nApiConfigured()) {
    return NextResponse.json(
      { message: "Chưa cấu hình N8N_API_URL / N8N_API_KEY trong web/.env.local." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json({ lanChay: await listN8nExecutions(quyTac.n8nWorkflowId, 10) });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Lỗi không xác định." },
      { status: 502 },
    );
  }
}
