import { redirect } from "next/navigation";
import KyKeToan, { type DongKy } from "@/components/dashboard/KyKeToan";
import { layNguoiDungTuPhien, yeuCauVaiTro } from "@/server/session";
import { danhSachKy } from "@/server/store/soThuChi";

export const dynamic = "force-dynamic";

export default async function TrangKyKeToan() {
  if (!(await yeuCauVaiTro("ke_toan"))) redirect("/dashboard");
  const nguoiDung = await layNguoiDungTuPhien();
  const laQuanLy = ["quan_ly", "admin"].includes(nguoiDung?.vaiTro ?? "");

  const ds = await danhSachKy();
  const dsKy: DongKy[] = ds.map((k) => ({
    ky: k.ky,
    trangThai: k.trangThai,
    khoaLuc: k.khoaLuc ? k.khoaLuc.toISOString() : null,
    ghiChu: k.ghiChu,
    tongHop: {
      tongThu: k.tongHop.tongThu,
      tongChi: k.tongHop.tongChi,
      lai: k.tongHop.lai,
      thuDaKeKhai: k.tongHop.thuDaKeKhai,
      soDongChuaQuyet: k.tongHop.soDongChuaQuyet,
    },
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Kỳ kế toán</h1>
        <p className="mt-1 text-sm text-white/50">
          Khoá sổ sau khi đã nộp tờ khai — từ đó mọi đường ghi vào kỳ bị từ chối
        </p>
      </header>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/55">
        <p>
          <strong className="text-white/80">Vì sao cần khoá sổ.</strong> Nộp tờ khai tháng 6 xong mà
          ai đó sửa một dòng tháng 6 thì số trong hệ thống không còn khớp tờ khai đã nộp, và không
          có gì báo. Khoá sổ biến chuyện đó thành một lỗi nhìn thấy được thay vì một sai lệch âm thầm.
        </p>
        <p className="mt-2">
          Điều kiện duy nhất để khoá: <strong className="text-white/80">không còn dòng doanh thu nào
          chưa quyết kê khai</strong>. Chốt một kỳ mà chính mình chưa biết phần nào sẽ vào tờ khai
          thì con dấu đó không có nghĩa gì.
        </p>
        {!laQuanLy && (
          <p className="mt-2 text-white/40">
            Tài khoản của bạn xem được nhưng không khoá được — khoá sổ là việc của quản lý.
          </p>
        )}
      </section>

      <KyKeToan dsKy={dsKy} laQuanLy={laQuanLy} />
    </div>
  );
}
