/**
 * Kho file — S3-compatible (Cloudflare R2 hoặc Backblaze B2).
 *
 * Neon là database, không phải kho file. Để file trên ổ đĩa VPS thì mất VPS là
 * mất toàn bộ chứng từ của khách; để trên Google Drive thì quay lại đúng cái
 * chị Mai đang kêu là lộn xộn.
 *
 * KHÔNG hardcode khoá. Bốn biến dưới đây do chủ dự án tự đặt vào .env.local —
 * xem .env.example. Thiếu biến thì `khoCauHinhChua()` trả false và đường tải lên
 * trả 503 kèm câu tiếng Việt nói rõ thiếu gì, thay vì đổ 500 không ai hiểu.
 */

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BIEN_CAN = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;

export function bienConThieu(): string[] {
  return BIEN_CAN.filter((b) => !process.env[b]);
}

export function khoCauHinhChua(): boolean {
  return bienConThieu().length === 0;
}

let khach: S3Client | undefined;

function layKhach(): S3Client {
  const thieu = bienConThieu();
  if (thieu.length > 0) {
    throw new Error(`Kho file chưa cấu hình. Thiếu: ${thieu.join(", ")}. Xem .env.example.`);
  }
  if (!khach) {
    khach = new S3Client({
      // R2 và B2 đều bỏ qua region nhưng SDK bắt buộc phải có một giá trị.
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true, // B2 cần; R2 chấp nhận được
    });
  }
  return khach;
}

const BUCKET = () => process.env.S3_BUCKET!;

export async function dayLen(duongDan: string, noiDung: Uint8Array, dinhDang?: string): Promise<void> {
  await layKhach().send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: duongDan,
      Body: noiDung,
      ContentType: dinhDang || "application/octet-stream",
    }),
  );
}

/**
 * Đường tải về ký sẵn, sống 5 phút.
 *
 * Không để bucket công khai: chứng từ có tên học viên và mức lương, mà một URL
 * công khai thì rò ra là rò vĩnh viễn. Ký ngắn hạn nghĩa là link chia sẻ nhầm
 * cũng chết sau năm phút.
 */
export async function duongTaiVe(duongDan: string, tenHienThi?: string): Promise<string> {
  const lenh = new GetObjectCommand({
    Bucket: BUCKET(),
    Key: duongDan,
    ResponseContentDisposition: tenHienThi
      ? `attachment; filename*=UTF-8''${encodeURIComponent(tenHienThi)}`
      : undefined,
  });
  return getSignedUrl(layKhach(), lenh, { expiresIn: 300 });
}

export async function xoaKhoiKho(duongDan: string): Promise<void> {
  await layKhach().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: duongDan }));
}
