CREATE TABLE "tai_lieu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ten" text NOT NULL,
	"loai" text NOT NULL,
	"ky" text,
	"nguon_loai" text,
	"nguon_id" uuid,
	"duong_dan" text NOT NULL,
	"dinh_dang" text,
	"kich_thuoc" bigint,
	"bam_noi_dung" text,
	"nguoi_tai_len_id" uuid,
	"ghi_chu" text,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tai_lieu_bam" UNIQUE("bam_noi_dung"),
	CONSTRAINT "tai_lieu_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "tai_lieu_loai_hop_le" CHECK ("tai_lieu"."loai" in ('chung_tu','hop_dong','ban_xuat_misa','to_khai','giay_phep','sao_ke','khac')),
	CONSTRAINT "tai_lieu_nguon_du_cap" CHECK (("tai_lieu"."nguon_loai" is null) = ("tai_lieu"."nguon_id" is null))
);
--> statement-breakpoint
ALTER TABLE "doanh_thu_phan_loai" ADD COLUMN "dien_ke_khai" text DEFAULT 'chua_quyet' NOT NULL;--> statement-breakpoint
ALTER TABLE "tai_lieu" ADD CONSTRAINT "tai_lieu_nguoi_tai_len_id_nguoi_dung_id_fk" FOREIGN KEY ("nguoi_tai_len_id") REFERENCES "public"."nguoi_dung"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doanh_thu_phan_loai" ADD CONSTRAINT "doanh_thu_dien_ke_khai_hop_le" CHECK ("doanh_thu_phan_loai"."dien_ke_khai" in ('da_ke_khai','chua_ke_khai','chua_quyet'));