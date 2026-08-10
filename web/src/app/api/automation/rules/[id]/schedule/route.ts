import { NextResponse } from "next/server";
import {
  getN8nWorkflow,
  isN8nApiConfigured,
  updateN8nWorkflow,
  type N8nWorkflowNode,
} from "@/server/n8nApi";
import { yeuCauVaiTro } from "@/server/session";
import { timQuyTac } from "@/server/store/automation";

/**
 * Đổi giờ chạy ở đây sẽ sửa thẳng node Schedule Trigger trong n8n — không phải
 * vào n8n UI sửa tay. Đây là loại thao tác n8n làm tốt và code không nên làm
 * lại: lịch, thử lại, lịch sử chạy.
 */
function dungKhoangLap(chuKy: string, gio: number, ngay?: number) {
  if (chuKy === "tuan") {
    return [{ field: "weeks", weeksInterval: 1, triggerAtDay: [ngay ?? 1], triggerAtHour: gio }];
  }
  if (chuKy === "thang") {
    return [{ field: "months", monthsInterval: 1, triggerAtDayOfMonth: ngay ?? 1, triggerAtHour: gio }];
  }
  return [{ field: "hours", hoursInterval: 24, triggerAtHour: gio }];
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await yeuCauVaiTro("quan_ly"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const gio = Number(body.gio);
  const ngay = body.ngay !== undefined ? Number(body.ngay) : undefined;
  const chuKy = String(body.chuKy ?? "ngay");

  if (!Number.isInteger(gio) || gio < 0 || gio > 23) {
    return NextResponse.json({ message: "Giờ chạy phải là số nguyên 0–23." }, { status: 400 });
  }
  if (!["ngay", "tuan", "thang"].includes(chuKy)) {
    return NextResponse.json({ message: "Chu kỳ phải là ngay, tuan hoặc thang." }, { status: 400 });
  }

  const quyTac = await timQuyTac((await params).id);
  if (!quyTac) return NextResponse.json({ message: "Không tìm thấy quy tắc." }, { status: 404 });
  if (!quyTac.n8nWorkflowId) {
    return NextResponse.json({ message: "Quy tắc chưa liên kết workflow n8n nào." }, { status: 400 });
  }
  if (!isN8nApiConfigured()) {
    return NextResponse.json({ message: "Chưa cấu hình N8N_API_URL / N8N_API_KEY." }, { status: 400 });
  }

  try {
    const wf = await getN8nWorkflow(quyTac.n8nWorkflowId);
    const nodes = wf.nodes.map((node: N8nWorkflowNode) =>
      node.type === "n8n-nodes-base.scheduleTrigger"
        ? { ...node, parameters: { ...node.parameters, rule: { interval: dungKhoangLap(chuKy, gio, ngay) } } }
        : node,
    );
    await updateN8nWorkflow(quyTac.n8nWorkflowId, {
      name: wf.name,
      nodes,
      connections: wf.connections,
      settings: wf.settings,
    });
    return NextResponse.json({ message: "Đã cập nhật lịch chạy." });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Không cập nhật được lịch chạy." },
      { status: 502 },
    );
  }
}
