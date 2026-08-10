import { redirect } from "next/navigation";
import { count } from "drizzle-orm";
import { db } from "@/server/db/client";
import { bhxhThamGia } from "@/server/db/schema";
import { yeuCauVaiTro } from "@/server/session";
import { layCaiDatCongTy } from "@/server/store/settings";
import { lichNghiaVu, quaHan, sapToiHan, type ChuKyKhai, type NghiaVu } from "@/server/tinhToan/nghiaVu";

export const dynamic = "force-dynamic";

function Dong({ n }: { n: NghiaVu }) {
  const tre = n.conBaoNhieuNgay < 0;
  const gap = !tre && n.conBaoNhieuNgay <= 7;
  return (
    <div
      className={`rounded-xl border p-4 ${
        tre
          ? "border-red-400/30 bg-red-400/5"
          : gap
            ? "border-amber-400/30 bg-amber-400/5"
            : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">
          {n.nhan} <span className="font-normal text-white/45">· kỳ {n.ky}</span>
        </p>
        <p className={`text-sm font-medium ${tre ? "text-red-300" : gap ? "text-amber-300" : "text-white/60"}`}>
          {tre ? `quá hạn ${-n.conBaoNhieuNgay} ngày` : n.conBaoNhieuNgay === 0 ? "hạn hôm nay" : `còn ${n.conBaoNhieuNgay} ngày`}
        </p>
      </div>
      <p className="mt-1 text-sm text-white/60">
        Hạn <strong className="text-white/80">{n.han}</strong>
        {n.doiViCuoiTuan && (
          <span className="text-white/40"> (gốc {n.hanGoc}, rơi cuối tuần nên dời sang ngày làm việc)</span>
        )}
      </p>
      <p className="mt-0.5 text-xs text-white/40">{n.canCu}</p>
      {n.canKiemLichLe && (
        <p className="mt-2 rounded-lg bg-white/[0.04] px-2 py-1 text-xs text-amber-200/70">
          Kiểm lại lịch nghỉ lễ. Tết và Giỗ Tổ tính theo âm lịch, lịch nghỉ do Chính phủ công bố từng
          năm — hệ thống <strong>không tự đoán</strong>, vì đoán ra một ngày rồi trình bày như hạn
          chính thức thì tệ hơn không nói gì.
        </p>
      )}
    </div>
  );
}

export default async function TrangNghiaVu() {
  if (!(await yeuCauVaiTro("ke_toan"))) redirect("/dashboard");

  const caiDat = await layCaiDatCongTy();
  const [bh] = await db.select({ n: count() }).from(bhxhThamGia);
  const coBhxh = Number(bh?.n ?? 0) > 0;

  const homNay = new Date().toISOString().slice(0, 10);
  const tatCa = lichNghiaVu(homNay, 90, {
    khaiTheo: caiDat.khaiThueTheo as ChuKyKhai,
    coBhxh,
  });
  const tre = quaHan(tatCa);
  const gap = sapToiHan(tatCa, 14);
  const sau = tatCa.filter((n) => n.conBaoNhieuNgay > 14);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Lịch nghĩa vụ</h1>
        <p className="mt-1 text-sm text-white/50">
          90 ngày tới · khai thuế theo{" "}
          <strong className="text-white/70">{caiDat.khaiThueTheo === "thang" ? "tháng" : "quý"}</strong>
          {" · "}
          {coBhxh ? "có tham gia BHXH" : "chưa có ai tham gia BHXH trong hệ thống"}
        </p>
      </header>

      {/* Chu kỳ khai đổi hẳn mọi mốc. Nói rõ nó đang lấy từ đâu, và mặc định là
          một phỏng đoán chứ không phải sự thật đã xác nhận. */}
      <p className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/50">
        Chu kỳ khai thuế đang lấy từ Cài đặt. Theo tháng thì hạn là ngày 20 tháng sau; theo quý thì
        hạn là ngày cuối tháng đầu quý sau — <strong className="text-white/70">chọn sai là cả lịch sai
        mọi mốc</strong>. Đây là thứ phải hỏi khách, không phải suy.
      </p>

      {tre.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-red-300">Đã quá hạn ({tre.length})</h2>
          <p className="text-sm text-white/50">
            Nhìn lại 30 ngày. Quên một hạn thì biết muộn còn hơn không biết — tiền phạt tính theo ngày.
          </p>
          {tre.map((n) => <Dong key={`${n.loai}-${n.ky}`} n={n} />)}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">Trong 14 ngày tới ({gap.length})</h2>
        {gap.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/35">
            Không có hạn nào trong hai tuần tới.
          </p>
        ) : (
          gap.map((n) => <Dong key={`${n.loai}-${n.ky}`} n={n} />)
        )}
      </section>

      {sau.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-white/70">Xa hơn ({sau.length})</h2>
          {sau.map((n) => <Dong key={`${n.loai}-${n.ky}`} n={n} />)}
        </section>
      )}

      <p className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/40">
        <strong className="text-white/60">Lệ phí môn bài không còn trong lịch này</strong> — từ 2026
        không phải nộp nữa. Ghi ra đây có chủ đích: nó là mốc quen thuộc nhất trong mọi lịch thuế cũ,
        và nhắc một nghĩa vụ đã bị bỏ là làm mất công đi làm một việc không tồn tại.
      </p>
    </div>
  );
}
