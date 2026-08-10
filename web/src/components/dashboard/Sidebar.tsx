"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BoltIcon, ChartIcon, HomeIcon, ReceiptIcon, SettingsIcon, StaffIcon, UsersIcon } from "./icons";

/**
 * Chỉ liệt kê trang ĐÃ CÓ. Mục `sapCo` hiện mờ và không bấm được — nói thật là
 * chưa có còn hơn để khách bấm vào một trang trắng rồi tự kết luận sản phẩm hỏng.
 */
const MUC = [
  { nhan: "Trang chủ", icon: HomeIcon, href: "/dashboard" },
  { nhan: "Kho tài liệu", icon: ReceiptIcon, href: "/dashboard/tai-lieu" },
  { nhan: "Cài đặt", icon: SettingsIcon, href: "/dashboard/settings" },
  { nhan: "Sổ thu chi", icon: ChartIcon, sapCo: "GĐ2" },
  { nhan: "Giáo viên · thù lao", icon: StaffIcon, sapCo: "GĐ3" },
  { nhan: "Học viên · học phí", icon: UsersIcon, sapCo: "GĐ5" },
  { nhan: "Tự động hoá", icon: BoltIcon, sapCo: "GĐ7" },
];

export default function Sidebar() {
  const duongDan = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-[#08080c] px-3 py-5">
      <Link href="/" className="mb-8 flex items-center gap-2 px-2 text-lg font-extrabold tracking-tight">
        ANSER<span className="text-white/40">·HSA</span>
      </Link>

      <nav className="flex flex-col gap-1">
        {MUC.map((m) => {
          const Icon = m.icon;

          if (!m.href) {
            return (
              <span
                key={m.nhan}
                className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/25"
                title={`Chưa dựng — dự kiến ${m.sapCo}`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{m.nhan}</span>
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium">{m.sapCo}</span>
              </span>
            );
          }

          const dangO =
            m.href === "/dashboard"
              ? duongDan === "/dashboard"
              : duongDan === m.href || duongDan.startsWith(`${m.href}/`);

          return (
            <Link
              key={m.nhan}
              href={m.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                dangO ? "bg-white/10 font-medium text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {m.nhan}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
