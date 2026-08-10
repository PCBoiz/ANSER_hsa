import { NextResponse } from "next/server";
import { activateN8nWorkflow, isN8nApiConfigured } from "@/server/n8nApi";
import { yeuCauVaiTro } from "@/server/session";
import { capNhatQuyTac, ghiLanChay, timQuyTac } from "@/server/store/automation";

/**
 * "Active" và "Chạy" là hai việc khác nhau trong n8n: Active chỉ vũ trang cho
 * trigger. Cả năm loại quy tắc của HSA đều chạy theo lịch, nên "Chạy" ở đây =
 * đảm bảo đã Active. n8n Public API không ép chạy ngay được với loại lịch.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await yeuCauVaiTro("quan_ly"))) {
    return NextResponse.json({ message: "Không đủ quyền." }, { status: 403 });
  }

  const quyTac = await timQuyTac((await params).id);
  if (!quyTac) return NextResponse.json({ message: "Không tìm thấy quy tắc." }, { status: 404 });
  if (!quyTac.n8nWorkflowId) {
    return NextResponse.json({ message: "Quy tắc chưa liên kết workflow n8n nào." }, { status: 400 });
  }
  if (!isN8nApiConfigured()) {
    return NextResponse.json({ message: "Chưa cấu hình N8N_API_URL / N8N_API_KEY." }, { status: 400 });
  }

  if (quyTac.bat) return NextResponse.json({ message: "Đã bật — sẽ chạy tự động theo lịch." });

  let bat = false;
  try {
    bat = Boolean((await activateN8nWorkflow(quyTac.n8nWorkflowId)).active);
  } catch {
    bat = false;
  }
  await capNhatQuyTac(quyTac.id, { bat });
  await ghiLanChay(quyTac.id, bat ? "da_bat" : "bat_that_bai");

  if (!bat) {
    return NextResponse.json({ message: "Không kích hoạt được — kiểm tra cấu hình n8n." }, { status: 502 });
  }
  return NextResponse.json({ message: "Đã kích hoạt — sẽ chạy tự động theo lịch." });
}
