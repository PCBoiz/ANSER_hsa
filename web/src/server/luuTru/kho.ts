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

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { DongKho } from "@/server/tinhToan/doiChieuKho";

const BIEN_CAN = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;

/**
 * Đọc biến môi trường và CẮT khoảng trắng hai đầu.
 *
 * Không phải làm đẹp. Dán khoá từ bảng điều khiển Cloudflare vào ô biến của
 * Railway rất dễ dính thêm dấu cách hoặc xuống dòng, và hậu quả thì lộ ra cách
 * chỗ gây lỗi ba tầng: URL vẫn ký được (ký chỉ là ghép chuỗi, không kiểm gì),
 * rồi R2 mới trả `Credential access key has length 35, should be 32` — cho
 * trình duyệt, không cho log máy chủ. Người dùng thấy "tải file hỏng".
 *
 * Đã mất một buổi vì đúng ba ký tự trắng, nên cắt ở đây một lần cho xong.
 */
function bien(ten: (typeof BIEN_CAN)[number] | "S3_REGION"): string | undefined {
  const v = process.env[ten]?.trim();
  return v ? v : undefined;
}

export function bienConThieu(): string[] {
  return BIEN_CAN.filter((b) => !bien(b));
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
      region: bien("S3_REGION") || "auto",
      endpoint: bien("S3_ENDPOINT"),
      credentials: {
        accessKeyId: bien("S3_ACCESS_KEY_ID")!,
        secretAccessKey: bien("S3_SECRET_ACCESS_KEY")!,
      },
      forcePathStyle: true, // B2 cần; R2 chấp nhận được
    });
  }
  return khach;
}

const BUCKET = () => bien("S3_BUCKET")!;

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
 * URL ký sẵn để TRÌNH DUYỆT tự đẩy file thẳng lên R2, không qua server.
 *
 * Lý do đổi: Vercel Function có trần body **4,5MB ở tầng hạ tầng**, không đổi
 * được bằng cấu hình. File đi qua server là mọi bản scan hợp đồng nhiều trang
 * đều 413. Tải thẳng thì server không gánh byte nào, và cách này chạy y hệt
 * trên VPS nên về sau không phải làm lại.
 *
 * URL gắn chặt vào ĐÚNG MỘT đường dẫn: người cầm được nó cũng chỉ ghi được vào
 * đúng khoá đó, không ghi đè file khác. Sống 10 phút.
 */
export async function duongTaiLen(duongDan: string, dinhDang?: string): Promise<string> {
  const lenh = new PutObjectCommand({
    Bucket: BUCKET(),
    Key: duongDan,
    ContentType: dinhDang || "application/octet-stream",
  });
  return getSignedUrl(layKhach(), lenh, { expiresIn: 600 });
}

export type ThongTinObject = { kichThuoc: number; etag: string; dinhDang: string | null };

/**
 * Hỏi R2 xem cái vừa được đẩy lên THẬT SỰ là gì.
 *
 * Đây là bước then chốt của cả thiết kế. Tải thẳng nghĩa là server không thấy
 * byte nào — nếu tin lời trình duyệt báo về thì kích thước và mã băm đều là thứ
 * client tự khai, và client thì nói dối được.
 *
 * `HEAD` một lần cho mỗi file, gần như không tốn gì, và đổi lại:
 *   - trần dung lượng ép được THẬT, không phải nhờ trình duyệt tử tế
 *   - ETag do R2 tính, không do client gửi
 *
 * Trả `null` khi object KHÔNG TỒN TẠI — tức là trình duyệt báo xong nhưng thực
 * ra chưa đẩy được. Không có nó thì sổ có một dòng trỏ vào hư không.
 *
 * Mọi lỗi KHÁC thì ném ra, không nuốt. Trước đây hàm này `catch { return null }`
 * cho tất cả, và cái giá phải trả là thật: khoá R2 trên Railway dính ba ký tự
 * trắng ở cuối, R2 từ chối xác thực, hàm này trả `null`, và người dùng nhận
 * đúng câu "Chưa thấy file trên kho. Có thể lần đẩy lên chưa xong." — một câu
 * chỉ đường sai hoàn toàn, vì file chưa bao giờ là vấn đề.
 *
 * Không tìm thấy và không xác thực được là hai chuyện khác nhau, và chỉ có
 * chuyện thứ nhất là bình thường.
 */
export async function thongTinObject(duongDan: string): Promise<ThongTinObject | null> {
  try {
    const r = await layKhach().send(new HeadObjectCommand({ Bucket: BUCKET(), Key: duongDan }));
    return {
      kichThuoc: Number(r.ContentLength ?? 0),
      // R2 trả ETag trong dấu nháy kép. Với file đẩy một lượt, nó là MD5 của
      // nội dung — yếu hơn SHA-256 trước va chạm cố ý, nhưng chống trùng vốn là
      // chống TẢI NHẦM HAI LẦN, và MD5 thừa sức cho việc đó. Điểm quan trọng là
      // nó do R2 tính chứ không do client khai.
      etag: String(r.ETag ?? "").replace(/^"|"$/g, ""),
      dinhDang: r.ContentType ?? null,
    };
  } catch (e) {
    if (laKhongTonTai(e)) return null;
    throw e;
  }
}

/** 404/NotFound/NoSuchKey = không có file. Mọi mã khác là chuyện của cấu hình. */
function laKhongTonTai(e: unknown): boolean {
  const x = e as { name?: string; $metadata?: { httpStatusCode?: number } };
  return x?.$metadata?.httpStatusCode === 404 || x?.name === "NotFound" || x?.name === "NoSuchKey";
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

/**
 * Liệt kê TOÀN BỘ object trong bucket.
 *
 * Phải lặp theo con trỏ: S3 trả tối đa 1000 khoá mỗi lượt, và nếu chỉ đọc lượt
 * đầu thì mọi thứ từ khoá 1001 trở đi sẽ bị coi như không tồn tại. Với việc đối
 * chiếu thì "không tồn tại" nghĩa là bỏ sót file mồ côi — còn nếu ai đó lỡ đảo
 * chiều phép so sánh thì nó nghĩa là XOÁ NHẦM file đang dùng. Nên vòng lặp này
 * không phải chuyện tối ưu, nó là chuyện đúng/sai.
 */
export async function lietKeKho(): Promise<DongKho[]> {
  const ra: DongKho[] = [];
  let contoTiep: string | undefined;
  do {
    const r = await layKhach().send(
      new ListObjectsV2Command({ Bucket: BUCKET(), ContinuationToken: contoTiep }),
    );
    for (const o of r.Contents ?? []) {
      if (!o.Key) continue;
      ra.push({
        duongDan: o.Key,
        kichThuoc: Number(o.Size ?? 0),
        sua: o.LastModified ?? new Date(0),
      });
    }
    contoTiep = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (contoTiep);
  return ra;
}
