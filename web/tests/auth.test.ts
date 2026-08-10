import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { kyToken, xacMinhToken } from "@/server/auth";

const KHOA_THAT = "k".repeat(64);
let khoaCu: string | undefined;

beforeEach(() => {
  khoaCu = process.env.JWT_SECRET;
  process.env.JWT_SECRET = KHOA_THAT;
});
afterEach(() => {
  if (khoaCu === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = khoaCu;
});

/**
 * Bên Body dòng khoá là `process.env.JWT_SECRET ?? "dev-secret-change-me"`, và
 * chuỗi đó nằm trong một repo công khai. Quên đặt biến môi trường thì app chạy
 * bình thường và ký mọi token bằng khoá cả thế giới đọc được — không lỗi, không
 * cảnh báo. Bốn test đầu giữ cho việc đó không quay lại.
 */
describe("khoá ký token", () => {
  it("thiếu JWT_SECRET thì ném lỗi, không lặng lẽ dùng khoá mặc định", () => {
    delete process.env.JWT_SECRET;
    expect(() => kyToken("nguoi-dung-1")).toThrow(/Thiếu JWT_SECRET/);
  });

  it("khoá quá ngắn bị từ chối", () => {
    process.env.JWT_SECRET = "ngan";
    expect(() => kyToken("nguoi-dung-1")).toThrow(/quá ngắn/);
  });

  it("chặn đúng chuỗi mẫu của Body nếu ai đó copy sang", () => {
    process.env.JWT_SECRET = "dev-secret-change-me";
    expect(() => kyToken("nguoi-dung-1")).toThrow();
  });
});

describe("ký và xác minh", () => {
  it("token ký ra thì xác minh lại được, kèm mã phiên", () => {
    const { token, jti } = kyToken("nguoi-dung-1");
    expect(xacMinhToken(token)).toEqual({ sub: "nguoi-dung-1", jti });
  });

  it("mỗi lần ký sinh một mã phiên khác — thu hồi được từng phiên", () => {
    const a = kyToken("nguoi-dung-1");
    const b = kyToken("nguoi-dung-1");
    expect(a.jti).not.toBe(b.jti);
  });

  it("token bị sửa thì không qua được", () => {
    const { token } = kyToken("nguoi-dung-1");
    expect(xacMinhToken(`${token}x`)).toBeNull();
  });

  it("token ký bằng khoá khác thì không qua được", () => {
    const { token } = kyToken("nguoi-dung-1");
    process.env.JWT_SECRET = "z".repeat(64);
    expect(xacMinhToken(token)).toBeNull();
  });

  it("rác thì trả null chứ không ném lỗi ra tầng route", () => {
    expect(xacMinhToken("khong-phai-jwt")).toBeNull();
    expect(xacMinhToken("")).toBeNull();
  });

  it("hạn phiên đặt đúng 7 ngày", () => {
    const { hetHanLuc } = kyToken("nguoi-dung-1");
    const ngay = (hetHanLuc.getTime() - Date.now()) / 86_400_000;
    expect(ngay).toBeGreaterThan(6.9);
    expect(ngay).toBeLessThan(7.1);
  });
});
