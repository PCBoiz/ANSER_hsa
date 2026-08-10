CREATE TABLE "can_cu_dien_thue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"khoan_thu_id" uuid NOT NULL,
	"can_cu_phap_ly" text NOT NULL,
	"ghi_chu" text,
	"nguoi_duyet_id" uuid,
	"duyet_luc" timestamp with time zone,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "can_cu_moi_khoan_thu_mot_dong" UNIQUE("khoan_thu_id")
);
--> statement-breakpoint
CREATE TABLE "khoan_chi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ngay" date NOT NULL,
	"ky" text NOT NULL,
	"so_tien" bigint NOT NULL,
	"mo_ta" text,
	"nhom" text NOT NULL,
	"duoc_tru" boolean DEFAULT false NOT NULL,
	"ly_do_khong_tru" text,
	"nguon_loai" text DEFAULT 'tu_nhap' NOT NULL,
	"nguon_id" uuid,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "khoan_chi_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "khoan_chi_ky_dung_dinh_dang" CHECK (ky ~ '^[0-9]{4}-[0-9]{2}$'),
	CONSTRAINT "khoan_chi_so_tien_duong" CHECK ("khoan_chi"."so_tien" > 0),
	CONSTRAINT "khoan_chi_nhom_hop_le" CHECK ("khoan_chi"."nhom" in ('thue_mat_bang','dien_nuoc','thu_lao','luong','marketing','thiet_bi','van_phong_pham','khac')),
	CONSTRAINT "khoan_chi_nguon_loai_hop_le" CHECK ("khoan_chi"."nguon_loai" in ('tu_nhap','thu_lao','bang_luong','khac')),
	CONSTRAINT "khoan_chi_nguon_du_cap" CHECK (("khoan_chi"."nguon_loai" = 'tu_nhap') = ("khoan_chi"."nguon_id" is null))
);
--> statement-breakpoint
CREATE TABLE "khoan_thu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ngay" date NOT NULL,
	"ky" text NOT NULL,
	"so_tien" bigint NOT NULL,
	"mo_ta" text,
	"dien_thue" text DEFAULT 'chua_quyet' NOT NULL,
	"dien_ke_khai" text DEFAULT 'chua_quyet' NOT NULL,
	"nguon_loai" text DEFAULT 'tu_nhap' NOT NULL,
	"nguon_id" uuid,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "khoan_thu_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "khoan_thu_ky_dung_dinh_dang" CHECK (ky ~ '^[0-9]{4}-[0-9]{2}$'),
	CONSTRAINT "khoan_thu_so_tien_duong" CHECK ("khoan_thu"."so_tien" > 0),
	CONSTRAINT "khoan_thu_dien_hop_le" CHECK ("khoan_thu"."dien_thue" in ('khong_chiu','gtgt_5','gtgt_10','chua_quyet')),
	CONSTRAINT "khoan_thu_ke_khai_hop_le" CHECK ("khoan_thu"."dien_ke_khai" in ('da_ke_khai','chua_ke_khai','chua_quyet')),
	CONSTRAINT "khoan_thu_nguon_loai_hop_le" CHECK ("khoan_thu"."nguon_loai" in ('tu_nhap','thu_hoc_phi','ban_tai_lieu','cho_thue','khac')),
	CONSTRAINT "khoan_thu_nguon_du_cap" CHECK (("khoan_thu"."nguon_loai" = 'tu_nhap') = ("khoan_thu"."nguon_id" is null))
);
--> statement-breakpoint
CREATE TABLE "ky_ke_toan" (
	"ky" text PRIMARY KEY NOT NULL,
	"trang_thai" text DEFAULT 'mo' NOT NULL,
	"khoa_luc" timestamp with time zone,
	"khoa_boi_id" uuid,
	"ghi_chu" text,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ky_ke_toan_ky_dung_dinh_dang" CHECK (ky ~ '^[0-9]{4}-[0-9]{2}$'),
	CONSTRAINT "ky_trang_thai_hop_le" CHECK ("ky_ke_toan"."trang_thai" in ('mo','dang_chot','da_khoa')),
	CONSTRAINT "ky_khoa_du_dau_vet" CHECK ("ky_ke_toan"."trang_thai" <> 'da_khoa' or ("ky_ke_toan"."khoa_luc" is not null and "ky_ke_toan"."khoa_boi_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "nhat_ky_thay_doi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bang" text NOT NULL,
	"ban_ghi_id" uuid NOT NULL,
	"hanh_dong" text NOT NULL,
	"truoc" jsonb,
	"sau" jsonb,
	"nguoi_dung_id" uuid,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nhat_ky_hanh_dong_hop_le" CHECK ("nhat_ky_thay_doi"."hanh_dong" in ('them','sua','xoa')),
	CONSTRAINT "nhat_ky_them_khong_co_truoc" CHECK ("nhat_ky_thay_doi"."hanh_dong" <> 'them' or "nhat_ky_thay_doi"."truoc" is null),
	CONSTRAINT "nhat_ky_xoa_khong_co_sau" CHECK ("nhat_ky_thay_doi"."hanh_dong" <> 'xoa' or "nhat_ky_thay_doi"."sau" is null)
);
--> statement-breakpoint
ALTER TABLE "doanh_thu_phan_loai" DROP CONSTRAINT "doanh_thu_nguon";--> statement-breakpoint
ALTER TABLE "hoc_vien_phu_huynh" DROP CONSTRAINT "hoc_vien_phu_huynh_cap";--> statement-breakpoint
ALTER TABLE "bang_luong" DROP CONSTRAINT "bang_luong_can_doi";--> statement-breakpoint
ALTER TABLE "doanh_thu_phan_loai" DROP CONSTRAINT "doanh_thu_phan_loai_nguon_hop_le";--> statement-breakpoint
ALTER TABLE "doanh_thu_phan_loai" DROP CONSTRAINT "doanh_thu_nguon_loai_hop_le";--> statement-breakpoint
ALTER TABLE "doanh_thu_phan_loai" DROP CONSTRAINT "doanh_thu_dien_hop_le";--> statement-breakpoint
ALTER TABLE "doanh_thu_phan_loai" DROP CONSTRAINT "doanh_thu_dien_ke_khai_hop_le";--> statement-breakpoint
ALTER TABLE "khop_thu" DROP CONSTRAINT "khop_suy_luan_phai_co_nguoi_duyet";--> statement-breakpoint
ALTER TABLE "doanh_thu_phan_loai" DROP CONSTRAINT "doanh_thu_phan_loai_nguoi_duyet_id_nguoi_dung_id_fk";
--> statement-breakpoint
ALTER TABLE "hoc_vien_phu_huynh" ADD CONSTRAINT "hoc_vien_phu_huynh_hoc_vien_id_phu_huynh_id_pk" PRIMARY KEY("hoc_vien_id","phu_huynh_id");--> statement-breakpoint
ALTER TABLE "bang_luong" ADD COLUMN "phu_cap" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bang_luong" ADD COLUMN "thuong" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bang_luong" ADD COLUMN "khau_tru_khac" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "buoi_day" ADD COLUMN "thu_lao_id" uuid;--> statement-breakpoint
ALTER TABLE "giao_dich_ngan_hang" ADD COLUMN "chieu" text NOT NULL;--> statement-breakpoint
ALTER TABLE "hoc_vien" ADD COLUMN "an_danh_luc" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "khop_thu" ADD COLUMN "khoan_thu_id" uuid;--> statement-breakpoint
ALTER TABLE "khop_thu" ADD COLUMN "so_tien" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "phu_huynh" ADD COLUMN "an_danh_luc" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "can_cu_dien_thue" ADD CONSTRAINT "can_cu_dien_thue_khoan_thu_id_khoan_thu_id_fk" FOREIGN KEY ("khoan_thu_id") REFERENCES "public"."khoan_thu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "can_cu_dien_thue" ADD CONSTRAINT "can_cu_dien_thue_nguoi_duyet_id_nguoi_dung_id_fk" FOREIGN KEY ("nguoi_duyet_id") REFERENCES "public"."nguoi_dung"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ky_ke_toan" ADD CONSTRAINT "ky_ke_toan_khoa_boi_id_nguoi_dung_id_fk" FOREIGN KEY ("khoa_boi_id") REFERENCES "public"."nguoi_dung"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nhat_ky_thay_doi" ADD CONSTRAINT "nhat_ky_thay_doi_nguoi_dung_id_nguoi_dung_id_fk" FOREIGN KEY ("nguoi_dung_id") REFERENCES "public"."nguoi_dung"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "khoan_chi_theo_ky" ON "khoan_chi" USING btree ("ky");--> statement-breakpoint
CREATE INDEX "khoan_chi_theo_ngay" ON "khoan_chi" USING btree ("ngay");--> statement-breakpoint
CREATE INDEX "khoan_thu_theo_ky" ON "khoan_thu" USING btree ("ky");--> statement-breakpoint
CREATE INDEX "khoan_thu_theo_ngay" ON "khoan_thu" USING btree ("ngay");--> statement-breakpoint
CREATE INDEX "nhat_ky_theo_ban_ghi" ON "nhat_ky_thay_doi" USING btree ("bang","ban_ghi_id");--> statement-breakpoint
ALTER TABLE "bac_thue_tncn" ADD CONSTRAINT "bac_thue_tncn_duyet_boi_id_nguoi_dung_id_fk" FOREIGN KEY ("duyet_boi_id") REFERENCES "public"."nguoi_dung"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buoi_day" ADD CONSTRAINT "buoi_day_thu_lao_id_thu_lao_id_fk" FOREIGN KEY ("thu_lao_id") REFERENCES "public"."thu_lao"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buoi_hoc" ADD CONSTRAINT "buoi_hoc_giao_vien_id_giao_vien_id_fk" FOREIGN KEY ("giao_vien_id") REFERENCES "public"."giao_vien"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "khop_thu" ADD CONSTRAINT "khop_thu_khoan_thu_id_khoan_thu_id_fk" FOREIGN KEY ("khoan_thu_id") REFERENCES "public"."khoan_thu"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nguoi_dung" ADD CONSTRAINT "nguoi_dung_nhan_vien_id_nhan_vien_id_fk" FOREIGN KEY ("nhan_vien_id") REFERENCES "public"."nhan_vien"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tham_so_phap_ly" ADD CONSTRAINT "tham_so_phap_ly_duyet_boi_id_nguoi_dung_id_fk" FOREIGN KEY ("duyet_boi_id") REFERENCES "public"."nguoi_dung"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "khop_theo_giao_dich" ON "khop_thu" USING btree ("giao_dich_id");--> statement-breakpoint
CREATE INDEX "tai_lieu_theo_ky" ON "tai_lieu" USING btree ("ky");--> statement-breakpoint
ALTER TABLE "hoc_vien" ADD CONSTRAINT "hoc_vien_ma_ngoai_unique" UNIQUE("ma_ngoai");--> statement-breakpoint
ALTER TABLE "bang_luong" ADD CONSTRAINT "bang_luong_ky_dung_dinh_dang" CHECK (ky ~ '^[0-9]{4}-[0-9]{2}$');--> statement-breakpoint
ALTER TABLE "bang_luong" ADD CONSTRAINT "bang_luong_can_doi" CHECK ("bang_luong"."thuc_nhan" = "bang_luong"."luong_thuc_te" + "bang_luong"."phu_cap" + "bang_luong"."thuong" - "bang_luong"."bhxh_nld" - "bang_luong"."tncn" - "bang_luong"."khau_tru_khac");--> statement-breakpoint
ALTER TABLE "giao_dich_ngan_hang" ADD CONSTRAINT "giao_dich_chieu_hop_le" CHECK ("giao_dich_ngan_hang"."chieu" in ('vao','ra'));--> statement-breakpoint
ALTER TABLE "giao_dich_ngan_hang" ADD CONSTRAINT "giao_dich_so_tien_duong" CHECK ("giao_dich_ngan_hang"."so_tien" > 0);--> statement-breakpoint
ALTER TABLE "khop_thu" ADD CONSTRAINT "khop_so_tien_duong" CHECK ("khop_thu"."so_tien" > 0);--> statement-breakpoint
ALTER TABLE "khop_thu" ADD CONSTRAINT "khop_suy_luan_phai_co_nguoi_duyet" CHECK ("khop_thu"."cach_khop" <> 'suy_luan' or "khop_thu"."duyet_luc" is not null or "khop_thu"."khoan_thu_id" is null);--> statement-breakpoint
ALTER TABLE "thu_lao" ADD CONSTRAINT "thu_lao_ky_dung_dinh_dang" CHECK (ky ~ '^[0-9]{4}-[0-9]{2}$');--> statement-breakpoint
-- ═══════════════════════════════════════════════════════════════════════════
-- Cưỡng chế APPEND-ONLY cho nhat_ky_thay_doi. Drizzle không sinh được phần này
-- nên nó viết tay, và mọi lần `drizzle-kit generate` sau đều KHÔNG đụng tới nó.
--
-- Dùng TRIGGER chứ không dùng `RULE ... DO INSTEAD NOTHING`: rule sẽ lặng lẽ
-- nuốt lệnh sửa, tức là code nghĩ đã sửa xong mà thực tế không có gì xảy ra.
-- Một nhật ký kiểm toán mà im lặng bỏ qua lệnh ghi thì tệ hơn là không có.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION nhat_ky_chi_duoc_them() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'nhat_ky_thay_doi chỉ được ghi thêm — không sửa, không xoá (bảng %, thao tác %)',
    TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER nhat_ky_chan_sua_xoa
  BEFORE UPDATE OR DELETE ON nhat_ky_thay_doi
  FOR EACH ROW EXECUTE FUNCTION nhat_ky_chi_duoc_them();
