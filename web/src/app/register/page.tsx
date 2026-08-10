"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import FloatingInput from "@/components/FloatingInput";

export default function RegisterPage() {
  const router = useRouter();
  const [ten, setTen] = useState("");
  const [ho, setHo] = useState("");
  const [email, setEmail] = useState("");
  const [dienThoai, setDienThoai] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ho, ten, email, dienThoai, matKhau }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message ?? "Đăng ký thất bại.");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo tài khoản. Vui lòng thử lại.");
      setLoading(false);
    }
  }

  return (
    <AuthShell
      brandTitle="Tạo tài khoản"
      brandSubtitle="Tài khoản đầu tiên là chủ trung tâm. Từ người thứ hai trở đi, quản lý cấp quyền trong mục Nhân sự."
      formTitle="Bắt đầu ngay"
      formSubtitle="Bước vào hành trình quản lý thông minh cùng ANSER"
      switchText="Đã có tài khoản?"
      switchLinkLabel="Đăng nhập ngay"
      switchHref="/login"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FloatingInput
            id="first_name"
            type="text"
            label="Họ"
            value={ten}
            onChange={(e) => setTen(e.target.value)}
            required
          />
          <FloatingInput
            id="last_name"
            type="text"
            label="Tên"
            value={ho}
            onChange={(e) => setHo(e.target.value)}
            required
          />
        </div>

        <FloatingInput
          id="email"
          type="email"
          label="Địa chỉ Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <FloatingInput
          id="dienThoai"
          type="tel"
          label="Số điện thoại (tùy chọn)"
          value={dienThoai}
          onChange={(e) => setDienThoai(e.target.value)}
        />
        <FloatingInput
          id="matKhau"
          type="password"
          label="Mật khẩu (ít nhất 8 ký tự)"
          value={matKhau}
          onChange={(e) => setMatKhau(e.target.value)}
          minLength={8}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-white py-4 text-[15px] font-bold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(255,255,255,0.2)] disabled:opacity-60"
        >
          {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        </button>
      </form>
    </AuthShell>
  );
}
