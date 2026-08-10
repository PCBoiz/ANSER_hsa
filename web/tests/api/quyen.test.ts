import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Ma trận phân quyền — chạy THẬT trên một server đang sống.
 *
 * Đây là lỗ hổng lớn nhất của bộ test trước: 127 test kia đều là hàm thuần, còn
 * toàn bộ API và phân quyền chỉ được kiểm bằng curl tay rồi xoá đi. Sửa một
 * dòng làm thủng quyền thì không có gì bắt được — mà thứ rò ra là mức lương
 * từng giáo viên và thông tin học viên chưa thành niên.
 *
 * Cách kiểm tránh gây tác dụng phụ: với vai trò ĐỦ quyền thì cố tình gửi thân
 * yêu cầu rác, nên nó dừng ở 400/404 — chứng minh đã qua cửa quyền mà không ghi
 * gì vào DB. Với vai trò THIẾU quyền thì phải nhận đúng 403.
 *
 * Chạy: `ANSER_TEST_URL=http://localhost:3000 npx vitest run tests/api`
 * Không đặt biến thì cả bộ bị bỏ qua, không làm đỏ CI vì lý do không liên quan.
 */

const URL_GOC = process.env.ANSER_TEST_URL;
const bo = !URL_GOC;

type VaiTro = "tro_giang" | "ke_toan" | "quan_ly" | "admin";
const THU_TU: VaiTro[] = ["tro_giang", "ke_toan", "quan_ly", "admin"];

const ADMIN = { email: "demo@anser-hsa.dev", matKhau: "demo1234" };
const dau = `kiemquyen-${Date.now()}`;
const cookie: Partial<Record<VaiTro | "khach", string>> = { khach: "" };
const idDaTao: string[] = [];

async function goi(
  duong: string,
  init: RequestInit & { vaiTro?: VaiTro | "khach" } = {},
): Promise<Response> {
  const { vaiTro, ...r } = init;
  const ck = vaiTro ? (cookie[vaiTro] ?? "") : "";
  return fetch(`${URL_GOC}${duong}`, {
    ...r,
    headers: { "Content-Type": "application/json", ...(ck ? { Cookie: ck } : {}), ...(r.headers ?? {}) },
    redirect: "manual",
  });
}

function nhatCookie(res: Response): string {
  const raw = res.headers.getSetCookie?.() ?? [];
  return raw.map((c) => c.split(";")[0]).join("; ");
}

async function dangNhap(email: string, matKhau: string): Promise<string> {
  const res = await fetch(`${URL_GOC}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, matKhau }),
  });
  if (!res.ok) throw new Error(`Đăng nhập hỏng cho ${email}: ${res.status}`);
  return nhatCookie(res);
}

beforeAll(async () => {
  if (bo) return;
  cookie.admin = await dangNhap(ADMIN.email, ADMIN.matKhau);

  for (const vt of ["tro_giang", "ke_toan", "quan_ly"] as const) {
    const email = `${dau}-${vt}@kiemthu.local`;
    const res = await goi("/api/users", {
      method: "POST",
      vaiTro: "admin",
      body: JSON.stringify({ ho: "Kiểm", ten: vt, email, matKhau: "kiemthu12345", vaiTro: vt }),
    });
    if (!res.ok) throw new Error(`Không tạo được tài khoản ${vt}: ${res.status} ${await res.text()}`);
    idDaTao.push((await res.json()).nguoiDung.id);
    cookie[vt] = await dangNhap(email, "kiemthu12345");
  }
}, 60_000);

afterAll(async () => {
  if (bo) return;
  for (const id of idDaTao) await goi(`/api/users/${id}`, { method: "DELETE", vaiTro: "admin" });
}, 60_000);

/** [phương thức, đường, vai trò tối thiểu, thân yêu cầu cố tình rác] */
const MA_TRAN: [string, string, VaiTro, unknown?][] = [
  ["GET", "/api/users", "quan_ly"],
  ["POST", "/api/users", "quan_ly", {}],
  ["GET", "/api/settings/company", "ke_toan"],
  ["PATCH", "/api/settings/company", "quan_ly", { vungLuongToiThieu: 99 }],
  ["GET", "/api/so-thu-chi/thu", "ke_toan"],
  ["POST", "/api/so-thu-chi/thu", "ke_toan", {}],
  ["GET", "/api/so-thu-chi/chi", "ke_toan"],
  ["POST", "/api/so-thu-chi/chi", "ke_toan", {}],
  ["PATCH", "/api/so-thu-chi/ke-khai", "ke_toan", {}],
  ["GET", "/api/giao-vien", "ke_toan"],
  ["POST", "/api/giao-vien", "ke_toan", {}],
  ["GET", "/api/thu-lao", "ke_toan"],
  ["POST", "/api/thu-lao", "quan_ly", {}],
  ["GET", "/api/tai-lieu", "ke_toan"],
  // Chỉ GET. POST của đường này XOÁ FILE THẬT, mà ma trận thì gọi cả chiều "đủ
  // quyền" — nên nó được kiểm riêng ở dưới, chỉ đúng chiều bị chặn.
  ["GET", "/api/tai-lieu/doi-chieu-kho", "quan_ly"],
  ["GET", "/api/tt29", "ke_toan"],
  ["PATCH", "/api/tt29", "quan_ly", { muc: "khong_ton_tai" }],
  ["GET", "/api/du-lieu-mau", "ke_toan"],
  ["GET", "/api/ky-ke-toan", "ke_toan"],
  ["PATCH", "/api/ky-ke-toan", "quan_ly", { ky: "sai" }],
  ["GET", "/api/automation/rules", "ke_toan"],
  ["POST", "/api/automation/rules", "quan_ly", {}],
];

describe.skipIf(bo)("ma trận phân quyền", () => {
  for (const [pt, duong, toiThieu, than] of MA_TRAN) {
    const canCap = THU_TU.indexOf(toiThieu);

    for (const vt of THU_TU) {
      const du = THU_TU.indexOf(vt) >= canCap;
      it(`${pt} ${duong} — ${vt} ${du ? "được vào" : "phải bị chặn 403"}`, async () => {
        const res = await goi(duong, {
          method: pt,
          vaiTro: vt,
          body: than !== undefined ? JSON.stringify(than) : undefined,
        });
        if (du) {
          // Qua cửa quyền là đủ. Thân rác nên dừng ở 400/404 — không ghi gì.
          expect(res.status, `${pt} ${duong} với ${vt}`).not.toBe(403);
        } else {
          expect(res.status, `${pt} ${duong} với ${vt}`).toBe(403);
        }
      });
    }

    it(`${pt} ${duong} — CHƯA ĐĂNG NHẬP phải bị chặn`, async () => {
      const res = await goi(duong, {
        method: pt,
        vaiTro: "khach",
        body: than !== undefined ? JSON.stringify(than) : undefined,
      });
      expect([401, 403]).toContain(res.status);
    });
  }
});

describe.skipIf(bo)("rò rỉ qua đường khác", () => {
  it("trợ giảng KHÔNG mở được trang thù lao — bị đá về trang chủ", async () => {
    const res = await goi("/dashboard/thu-lao", { vaiTro: "tro_giang" });
    expect([302, 307]).toContain(res.status);
  });

  it("trợ giảng KHÔNG mở được trang sổ thu chi", async () => {
    const res = await goi("/dashboard/so-thu-chi", { vaiTro: "tro_giang" });
    expect([302, 307]).toContain(res.status);
  });

  it("gọi id không tồn tại thì 404, không lộ có hay không", async () => {
    const gia = "00000000-0000-4000-8000-000000000000";
    const res = await goi(`/api/tai-lieu/${gia}`, { vaiTro: "ke_toan" });
    expect(res.status).toBe(404);
  });

  it("trạng thái n8n KHÔNG được trả cho người lạ", async () => {
    // Rò cấu hình hạ tầng cho người chưa đăng nhập là không có lý do gì.
    const res = await goi("/api/n8n/status", { vaiTro: "khach" });
    expect([401, 403]).toContain(res.status);
  });

  it("/api/health vẫn mở — cần cho giám sát", async () => {
    expect((await goi("/api/health", { vaiTro: "khach" })).status).toBe(200);
  });

  /**
   * Dọn kho là thao tác XOÁ FILE. Chỉ kiểm chiều bị chặn — gọi thử chiều đủ
   * quyền là thật sự xoá, và một test không được phép làm việc đó.
   */
  it("dọn kho: kế toán và dưới đều bị chặn 403", async () => {
    for (const vt of ["khach", "tro_giang", "ke_toan"] as const) {
      const res = await goi("/api/tai-lieu/doi-chieu-kho", { method: "POST", vaiTro: vt });
      expect([401, 403], `POST dọn kho với ${vt}`).toContain(res.status);
    }
  });
});

describe.skipIf(bo)("phiên và mật khẩu", () => {
  it("đăng xuất xong thì cookie cũ hết dùng được", async () => {
    const ck = await dangNhap(ADMIN.email, ADMIN.matKhau);
    expect((await fetch(`${URL_GOC}/api/auth/me`, { headers: { Cookie: ck } })).status).toBe(200);
    await fetch(`${URL_GOC}/api/auth/logout`, { method: "POST", headers: { Cookie: ck } });
    expect((await fetch(`${URL_GOC}/api/auth/me`, { headers: { Cookie: ck } })).status).toBe(401);
  });

  it("cookie bịa không qua được", async () => {
    const res = await fetch(`${URL_GOC}/api/auth/me`, {
      headers: { Cookie: "anser_hsa_token=khong-phai-jwt" },
    });
    expect(res.status).toBe(401);
  });

  it("mật khẩu dưới 8 ký tự bị từ chối", async () => {
    const res = await goi("/api/users", {
      method: "POST",
      vaiTro: "admin",
      body: JSON.stringify({ ho: "A", ten: "B", email: `${dau}-ngan@kiemthu.local`, matKhau: "1234567" }),
    });
    expect(res.status).toBe(400);
  });

  it("quản lý KHÔNG tự cấp được quyền admin", async () => {
    const res = await goi("/api/users", {
      method: "POST",
      vaiTro: "quan_ly",
      body: JSON.stringify({
        ho: "A",
        ten: "B",
        email: `${dau}-admin@kiemthu.local`,
        matKhau: "kiemthu12345",
        vaiTro: "admin",
      }),
    });
    expect(res.status).toBe(400);
  });
});
