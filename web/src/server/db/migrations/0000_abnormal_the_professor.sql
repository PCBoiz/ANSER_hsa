CREATE TABLE "bac_thue_tncn" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bac" integer NOT NULL,
	"tu_thu_nhap" bigint NOT NULL,
	"den_thu_nhap" bigint,
	"thue_suat" numeric(5, 2) NOT NULL,
	"hieu_luc_tu" date NOT NULL,
	"hieu_luc_den" date,
	"nguon_van_ban" text NOT NULL,
	CONSTRAINT "bac_thue_bac_hieu_luc" UNIQUE("bac","hieu_luc_tu"),
	CONSTRAINT "bac_thue_dai_hop_le" CHECK ("bac_thue_tncn"."den_thu_nhap" is null or "bac_thue_tncn"."den_thu_nhap" > "bac_thue_tncn"."tu_thu_nhap")
);
--> statement-breakpoint
CREATE TABLE "bang_luong" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nhan_vien_id" uuid NOT NULL,
	"ky" text NOT NULL,
	"luong_thuc_te" bigint NOT NULL,
	"luong_dong_bhxh" bigint NOT NULL,
	"bhxh_nld" bigint DEFAULT 0 NOT NULL,
	"bhxh_dn" bigint DEFAULT 0 NOT NULL,
	"giam_tru_ban_than" bigint NOT NULL,
	"giam_tru_phu_thuoc" bigint DEFAULT 0 NOT NULL,
	"thu_nhap_tinh_thue" bigint DEFAULT 0 NOT NULL,
	"tncn" bigint DEFAULT 0 NOT NULL,
	"thuc_nhan" bigint NOT NULL,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bang_luong_nhan_vien_ky" UNIQUE("nhan_vien_id","ky"),
	CONSTRAINT "bang_luong_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "bang_luong_dong_khong_vuot_thuc_te" CHECK ("bang_luong"."luong_dong_bhxh" <= "bang_luong"."luong_thuc_te"),
	CONSTRAINT "bang_luong_can_doi" CHECK ("bang_luong"."thuc_nhan" = "bang_luong"."luong_thuc_te" - "bang_luong"."bhxh_nld" - "bang_luong"."tncn")
);
--> statement-breakpoint
CREATE TABLE "bhxh_tham_gia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nhan_vien_id" uuid NOT NULL,
	"so_so_bhxh" text,
	"tham_gia_tu" date NOT NULL,
	"ket_thuc" date,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bhxh_tham_gia_nguon_hop_le" CHECK (nguon in ('mau','that'))
);
--> statement-breakpoint
CREATE TABLE "bien_lai" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"so" text NOT NULL,
	"thu_hoc_phi_id" uuid NOT NULL,
	"ngay" date NOT NULL,
	"da_gui_luc" timestamp with time zone,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bien_lai_so_unique" UNIQUE("so"),
	CONSTRAINT "bien_lai_nguon_hop_le" CHECK (nguon in ('mau','that'))
);
--> statement-breakpoint
CREATE TABLE "buoi_day" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"giao_vien_id" uuid NOT NULL,
	"buoi_hoc_id" uuid,
	"ngay" date NOT NULL,
	"so_gio" numeric(5, 2),
	"don_gia" bigint NOT NULL,
	"tinh_theo" text DEFAULT 'buoi' NOT NULL,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buoi_day_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "buoi_day_tinh_theo_hop_le" CHECK ("buoi_day"."tinh_theo" in ('buoi','gio')),
	CONSTRAINT "buoi_day_theo_gio_phai_co_so_gio" CHECK ("buoi_day"."tinh_theo" <> 'gio' or "buoi_day"."so_gio" is not null)
);
--> statement-breakpoint
CREATE TABLE "buoi_hoc" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lop_hoc_id" uuid NOT NULL,
	"ngay" date NOT NULL,
	"gio_bat_dau" text,
	"so_gio" numeric(5, 2),
	"giao_vien_id" uuid,
	"trang_thai" text DEFAULT 'theo_lich' NOT NULL,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buoi_hoc_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "buoi_hoc_trang_thai_hop_le" CHECK ("buoi_hoc"."trang_thai" in ('theo_lich','da_day','nghi','doi_lich'))
);
--> statement-breakpoint
CREATE TABLE "cai_dat_cong_ty" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ten" text DEFAULT 'ANSER-HSA' NOT NULL,
	"dia_chi" text,
	"dien_thoai" text,
	"email" text,
	"ma_so_thue" text,
	"vung_luong_toi_thieu" integer DEFAULT 1 NOT NULL,
	"cap_nhat_luc" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cam_ket_08" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"giao_vien_id" uuid NOT NULL,
	"nam" integer NOT NULL,
	"nop_luc" date,
	"duong_dan_file" text,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cam_ket_08_giao_vien_nam" UNIQUE("giao_vien_id","nam"),
	CONSTRAINT "cam_ket_08_nguon_hop_le" CHECK (nguon in ('mau','that'))
);
--> statement-breakpoint
CREATE TABLE "dang_ky" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hoc_vien_id" uuid NOT NULL,
	"lop_hoc_id" uuid NOT NULL,
	"ngay_dang_ky" date NOT NULL,
	"hoc_phi_ap_dung" bigint NOT NULL,
	"trang_thai" text DEFAULT 'dang_hoc' NOT NULL,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dang_ky_hoc_vien_lop" UNIQUE("hoc_vien_id","lop_hoc_id"),
	CONSTRAINT "dang_ky_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "dang_ky_trang_thai_hop_le" CHECK ("dang_ky"."trang_thai" in ('dang_hoc','bao_luu','da_xong','da_huy'))
);
--> statement-breakpoint
CREATE TABLE "doanh_thu_phan_loai" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nguon_loai" text NOT NULL,
	"nguon_id" uuid NOT NULL,
	"so_tien" bigint NOT NULL,
	"dien_thue" text NOT NULL,
	"can_cu_phap_ly" text NOT NULL,
	"nguoi_duyet_id" uuid,
	"duyet_luc" timestamp with time zone,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "doanh_thu_nguon" UNIQUE("nguon_loai","nguon_id"),
	CONSTRAINT "doanh_thu_phan_loai_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "doanh_thu_nguon_loai_hop_le" CHECK ("doanh_thu_phan_loai"."nguon_loai" in ('thu_hoc_phi','ban_tai_lieu','cho_thue','khac')),
	CONSTRAINT "doanh_thu_dien_hop_le" CHECK ("doanh_thu_phan_loai"."dien_thue" in ('khong_chiu','gtgt_5','gtgt_10'))
);
--> statement-breakpoint
CREATE TABLE "dong_y_du_lieu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chu_the_loai" text NOT NULL,
	"chu_the_id" uuid NOT NULL,
	"pham_vi" text NOT NULL,
	"thoi_diem" timestamp with time zone NOT NULL,
	"nguon_dong_y" text NOT NULL,
	"nguoi_dai_dien_ho_ten" text,
	"rut_lai_luc" timestamp with time zone,
	"ghi_chu" text,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dong_y_du_lieu_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "dong_y_chu_the_hop_le" CHECK ("dong_y_du_lieu"."chu_the_loai" in ('hoc_vien','phu_huynh','giao_vien','nhan_vien')),
	CONSTRAINT "dong_y_nguon_hop_le" CHECK ("dong_y_du_lieu"."nguon_dong_y" in ('ban_giay','zalo','email','tren_app'))
);
--> statement-breakpoint
CREATE TABLE "giao_dich_ngan_hang" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ma_giao_dich" text NOT NULL,
	"ngay" timestamp with time zone NOT NULL,
	"so_tien" bigint NOT NULL,
	"noi_dung" text,
	"ngan_hang" text,
	"so_tai_khoan" text,
	"nguon_nap" text NOT NULL,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "giao_dich_ngan_hang_ma_giao_dich_unique" UNIQUE("ma_giao_dich"),
	CONSTRAINT "giao_dich_ngan_hang_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "giao_dich_nguon_nap_hop_le" CHECK ("giao_dich_ngan_hang"."nguon_nap" in ('sepay','sao_ke'))
);
--> statement-breakpoint
CREATE TABLE "giao_vien" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nhan_vien_id" uuid,
	"ho_ten" text NOT NULL,
	"mon" text,
	"dien_thoai" text,
	"ma_so_thue" text,
	"loai" text DEFAULT 'thinh_giang' NOT NULL,
	"la_gv_truong_cong" boolean DEFAULT false NOT NULL,
	"da_bao_cao_hieu_truong" boolean DEFAULT false NOT NULL,
	"cong_khai_danh_sach" boolean DEFAULT false NOT NULL,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "giao_vien_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "giao_vien_loai_hop_le" CHECK ("giao_vien"."loai" in ('co_huu','thinh_giang')),
	CONSTRAINT "giao_vien_co_huu_phai_co_ho_so" CHECK ("giao_vien"."loai" <> 'co_huu' or "giao_vien"."nhan_vien_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "ho_so_tt29" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"muc" text NOT NULL,
	"trang_thai" text DEFAULT 'thieu' NOT NULL,
	"cong_khai_tai" text,
	"cap_nhat_luc" timestamp with time zone,
	"ghi_chu" text,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ho_so_tt29_muc_unique" UNIQUE("muc"),
	CONSTRAINT "ho_so_tt29_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "tt29_muc_hop_le" CHECK ("ho_so_tt29"."muc" in ('mon_hoc','thoi_luong_theo_khoi','dia_diem_hinh_thuc_thoi_gian','danh_sach_nguoi_day','muc_thu_hoc_phi','dang_ky_kinh_doanh')),
	CONSTRAINT "tt29_trang_thai_hop_le" CHECK ("ho_so_tt29"."trang_thai" in ('thieu','dang_lam','da_cong_khai'))
);
--> statement-breakpoint
CREATE TABLE "hoc_vien" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ma" text NOT NULL,
	"ho_ten" text NOT NULL,
	"ngay_sinh" date,
	"dien_thoai" text,
	"email" text,
	"truong" text,
	"khoi_lop" text,
	"ma_ngoai" text,
	"ghi_chu" text,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hoc_vien_ma_unique" UNIQUE("ma"),
	CONSTRAINT "hoc_vien_nguon_hop_le" CHECK (nguon in ('mau','that'))
);
--> statement-breakpoint
CREATE TABLE "hoc_vien_phu_huynh" (
	"hoc_vien_id" uuid NOT NULL,
	"phu_huynh_id" uuid NOT NULL,
	"quan_he" text,
	"la_nguoi_dai_dien" boolean DEFAULT false NOT NULL,
	CONSTRAINT "hoc_vien_phu_huynh_cap" UNIQUE("hoc_vien_id","phu_huynh_id")
);
--> statement-breakpoint
CREATE TABLE "hop_dong_dao_tao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"so" text NOT NULL,
	"hoc_vien_id" uuid NOT NULL,
	"ngay_ky" date NOT NULL,
	"duong_dan_file" text,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hop_dong_dao_tao_so_unique" UNIQUE("so"),
	CONSTRAINT "hop_dong_dao_tao_nguon_hop_le" CHECK (nguon in ('mau','that'))
);
--> statement-breakpoint
CREATE TABLE "hop_dong_lao_dong" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"so" text NOT NULL,
	"nhan_vien_id" uuid NOT NULL,
	"loai" text NOT NULL,
	"tu_ngay" date NOT NULL,
	"den_ngay" date,
	"luong_co_ban" bigint NOT NULL,
	"luong_dong_bhxh" bigint,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hop_dong_lao_dong_so_unique" UNIQUE("so"),
	CONSTRAINT "hop_dong_lao_dong_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "hdld_loai_hop_le" CHECK ("hop_dong_lao_dong"."loai" in ('khong_xac_dinh','xac_dinh','duoi_3_thang')),
	CONSTRAINT "hdld_khoang_hop_le" CHECK ("hop_dong_lao_dong"."den_ngay" is null or "hop_dong_lao_dong"."den_ngay" > "hop_dong_lao_dong"."tu_ngay"),
	CONSTRAINT "hdld_khong_xac_dinh_khong_co_han" CHECK ("hop_dong_lao_dong"."loai" <> 'khong_xac_dinh' or "hop_dong_lao_dong"."den_ngay" is null)
);
--> statement-breakpoint
CREATE TABLE "khop_thu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"giao_dich_id" uuid NOT NULL,
	"thu_hoc_phi_id" uuid,
	"cach_khop" text NOT NULL,
	"do_tin_cay" numeric(4, 3),
	"nguoi_duyet_id" uuid,
	"duyet_luc" timestamp with time zone,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "khop_thu_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "khop_cach_hop_le" CHECK ("khop_thu"."cach_khop" in ('ma_qr','suy_luan','nguoi_gan')),
	CONSTRAINT "khop_suy_luan_phai_co_nguoi_duyet" CHECK ("khop_thu"."cach_khop" <> 'suy_luan' or "khop_thu"."duyet_luc" is not null or "khop_thu"."thu_hoc_phi_id" is null)
);
--> statement-breakpoint
CREATE TABLE "lan_dang_nhap_hong" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"dia_chi_ip" text,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lop_hoc" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ma" text NOT NULL,
	"ten" text NOT NULL,
	"mon" text NOT NULL,
	"khoi_lop" text,
	"so_buoi" integer,
	"hoc_phi_moi_buoi" bigint,
	"hoc_phi_ca_khoa" bigint,
	"dia_diem" text,
	"hinh_thuc" text,
	"bat_dau" date,
	"ket_thuc" date,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lop_hoc_ma_unique" UNIQUE("ma"),
	CONSTRAINT "lop_hoc_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "lop_hoc_co_hoc_phi" CHECK ("lop_hoc"."hoc_phi_moi_buoi" is not null or "lop_hoc"."hoc_phi_ca_khoa" is not null)
);
--> statement-breakpoint
CREATE TABLE "nghia_vu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loai" text NOT NULL,
	"ky" text NOT NULL,
	"han_nop" date NOT NULL,
	"trang_thai" text DEFAULT 'chua_nop' NOT NULL,
	"nhac_luc" timestamp with time zone,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nghia_vu_loai_ky" UNIQUE("loai","ky"),
	CONSTRAINT "nghia_vu_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "nghia_vu_trang_thai_hop_le" CHECK ("nghia_vu"."trang_thai" in ('chua_nop','da_nop','tre_han'))
);
--> statement-breakpoint
CREATE TABLE "nguoi_dung" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ho" text NOT NULL,
	"ten" text NOT NULL,
	"email" text NOT NULL,
	"dien_thoai" text,
	"mat_khau_hash" text NOT NULL,
	"vai_tro" text DEFAULT 'tro_giang' NOT NULL,
	"nhan_vien_id" uuid,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nguoi_dung_email_unique" UNIQUE("email"),
	CONSTRAINT "nguoi_dung_vai_tro_hop_le" CHECK ("nguoi_dung"."vai_tro" in ('tro_giang','ke_toan','quan_ly','admin'))
);
--> statement-breakpoint
CREATE TABLE "nguoi_phu_thuoc" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nhan_vien_id" uuid NOT NULL,
	"ho_ten" text NOT NULL,
	"quan_he" text,
	"ma_so_thue" text,
	"giam_tru_tu" date NOT NULL,
	"giam_tru_den" date,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nguoi_phu_thuoc_nguon_hop_le" CHECK (nguon in ('mau','that'))
);
--> statement-breakpoint
CREATE TABLE "nhan_vien" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ho_ten" text NOT NULL,
	"chuc_vu" text,
	"dien_thoai" text,
	"email" text,
	"ma_so_thue" text,
	"ngay_vao" date,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nhan_vien_nguon_hop_le" CHECK (nguon in ('mau','that'))
);
--> statement-breakpoint
CREATE TABLE "phien_dang_nhap" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nguoi_dung_id" uuid NOT NULL,
	"jti" text NOT NULL,
	"het_han_luc" timestamp with time zone NOT NULL,
	"thu_hoi_luc" timestamp with time zone,
	"dia_chi_ip" text,
	"trinh_duyet" text,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "phien_dang_nhap_jti_unique" UNIQUE("jti")
);
--> statement-breakpoint
CREATE TABLE "phu_huynh" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ho_ten" text NOT NULL,
	"dien_thoai" text,
	"email" text,
	"zalo_id" text,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "phu_huynh_nguon_hop_le" CHECK (nguon in ('mau','that'))
);
--> statement-breakpoint
CREATE TABLE "quy_tac_tu_dong" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ten" text NOT NULL,
	"loai" text NOT NULL,
	"bat" boolean DEFAULT true NOT NULL,
	"n8n_workflow_id" text,
	"chay_lan_cuoi" timestamp with time zone,
	"trang_thai_lan_cuoi" text,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quy_tac_loai_hop_le" CHECK ("quy_tac_tu_dong"."loai" in ('nhac_han_nghia_vu','nhac_hoc_phi','nhac_ho_so_tt29','nhac_cam_ket_08','bao_cao_thang'))
);
--> statement-breakpoint
CREATE TABLE "tham_so_phap_ly" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ma" text NOT NULL,
	"gia_tri" numeric(18, 4) NOT NULL,
	"don_vi" text NOT NULL,
	"hieu_luc_tu" date NOT NULL,
	"hieu_luc_den" date,
	"nguon_van_ban" text NOT NULL,
	"ghi_chu" text,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tham_so_ma_hieu_luc" UNIQUE("ma","hieu_luc_tu"),
	CONSTRAINT "tham_so_don_vi_hop_le" CHECK ("tham_so_phap_ly"."don_vi" in ('vnd','phan_tram','lan')),
	CONSTRAINT "tham_so_khoang_hop_le" CHECK ("tham_so_phap_ly"."hieu_luc_den" is null or "tham_so_phap_ly"."hieu_luc_den" > "tham_so_phap_ly"."hieu_luc_tu")
);
--> statement-breakpoint
CREATE TABLE "thu_hoc_phi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dang_ky_id" uuid NOT NULL,
	"so_tien" bigint NOT NULL,
	"ngay_thu" date NOT NULL,
	"hinh_thuc" text NOT NULL,
	"noi_dung_qr" text,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "thu_hoc_phi_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "thu_hoc_phi_duong" CHECK ("thu_hoc_phi"."so_tien" > 0),
	CONSTRAINT "thu_hoc_phi_hinh_thuc_hop_le" CHECK ("thu_hoc_phi"."hinh_thuc" in ('tien_mat','chuyen_khoan','vi'))
);
--> statement-breakpoint
CREATE TABLE "thu_lao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"giao_vien_id" uuid NOT NULL,
	"ky" text NOT NULL,
	"tong_truoc_thue" bigint NOT NULL,
	"khau_tru_tncn" bigint DEFAULT 0 NOT NULL,
	"thuc_nhan" bigint NOT NULL,
	"nguong_ap_dung" bigint NOT NULL,
	"co_cam_ket_08" boolean DEFAULT false NOT NULL,
	"nguon" text DEFAULT 'that' NOT NULL,
	"tao_luc" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "thu_lao_giao_vien_ky" UNIQUE("giao_vien_id","ky"),
	CONSTRAINT "thu_lao_nguon_hop_le" CHECK (nguon in ('mau','that')),
	CONSTRAINT "thu_lao_can_doi" CHECK ("thu_lao"."thuc_nhan" = "thu_lao"."tong_truoc_thue" - "thu_lao"."khau_tru_tncn")
);
--> statement-breakpoint
ALTER TABLE "bang_luong" ADD CONSTRAINT "bang_luong_nhan_vien_id_nhan_vien_id_fk" FOREIGN KEY ("nhan_vien_id") REFERENCES "public"."nhan_vien"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bhxh_tham_gia" ADD CONSTRAINT "bhxh_tham_gia_nhan_vien_id_nhan_vien_id_fk" FOREIGN KEY ("nhan_vien_id") REFERENCES "public"."nhan_vien"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bien_lai" ADD CONSTRAINT "bien_lai_thu_hoc_phi_id_thu_hoc_phi_id_fk" FOREIGN KEY ("thu_hoc_phi_id") REFERENCES "public"."thu_hoc_phi"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buoi_day" ADD CONSTRAINT "buoi_day_giao_vien_id_giao_vien_id_fk" FOREIGN KEY ("giao_vien_id") REFERENCES "public"."giao_vien"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buoi_day" ADD CONSTRAINT "buoi_day_buoi_hoc_id_buoi_hoc_id_fk" FOREIGN KEY ("buoi_hoc_id") REFERENCES "public"."buoi_hoc"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buoi_hoc" ADD CONSTRAINT "buoi_hoc_lop_hoc_id_lop_hoc_id_fk" FOREIGN KEY ("lop_hoc_id") REFERENCES "public"."lop_hoc"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cam_ket_08" ADD CONSTRAINT "cam_ket_08_giao_vien_id_giao_vien_id_fk" FOREIGN KEY ("giao_vien_id") REFERENCES "public"."giao_vien"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dang_ky" ADD CONSTRAINT "dang_ky_hoc_vien_id_hoc_vien_id_fk" FOREIGN KEY ("hoc_vien_id") REFERENCES "public"."hoc_vien"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dang_ky" ADD CONSTRAINT "dang_ky_lop_hoc_id_lop_hoc_id_fk" FOREIGN KEY ("lop_hoc_id") REFERENCES "public"."lop_hoc"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doanh_thu_phan_loai" ADD CONSTRAINT "doanh_thu_phan_loai_nguoi_duyet_id_nguoi_dung_id_fk" FOREIGN KEY ("nguoi_duyet_id") REFERENCES "public"."nguoi_dung"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giao_vien" ADD CONSTRAINT "giao_vien_nhan_vien_id_nhan_vien_id_fk" FOREIGN KEY ("nhan_vien_id") REFERENCES "public"."nhan_vien"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hoc_vien_phu_huynh" ADD CONSTRAINT "hoc_vien_phu_huynh_hoc_vien_id_hoc_vien_id_fk" FOREIGN KEY ("hoc_vien_id") REFERENCES "public"."hoc_vien"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hoc_vien_phu_huynh" ADD CONSTRAINT "hoc_vien_phu_huynh_phu_huynh_id_phu_huynh_id_fk" FOREIGN KEY ("phu_huynh_id") REFERENCES "public"."phu_huynh"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hop_dong_dao_tao" ADD CONSTRAINT "hop_dong_dao_tao_hoc_vien_id_hoc_vien_id_fk" FOREIGN KEY ("hoc_vien_id") REFERENCES "public"."hoc_vien"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hop_dong_lao_dong" ADD CONSTRAINT "hop_dong_lao_dong_nhan_vien_id_nhan_vien_id_fk" FOREIGN KEY ("nhan_vien_id") REFERENCES "public"."nhan_vien"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "khop_thu" ADD CONSTRAINT "khop_thu_giao_dich_id_giao_dich_ngan_hang_id_fk" FOREIGN KEY ("giao_dich_id") REFERENCES "public"."giao_dich_ngan_hang"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "khop_thu" ADD CONSTRAINT "khop_thu_thu_hoc_phi_id_thu_hoc_phi_id_fk" FOREIGN KEY ("thu_hoc_phi_id") REFERENCES "public"."thu_hoc_phi"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "khop_thu" ADD CONSTRAINT "khop_thu_nguoi_duyet_id_nguoi_dung_id_fk" FOREIGN KEY ("nguoi_duyet_id") REFERENCES "public"."nguoi_dung"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nguoi_phu_thuoc" ADD CONSTRAINT "nguoi_phu_thuoc_nhan_vien_id_nhan_vien_id_fk" FOREIGN KEY ("nhan_vien_id") REFERENCES "public"."nhan_vien"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phien_dang_nhap" ADD CONSTRAINT "phien_dang_nhap_nguoi_dung_id_nguoi_dung_id_fk" FOREIGN KEY ("nguoi_dung_id") REFERENCES "public"."nguoi_dung"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thu_hoc_phi" ADD CONSTRAINT "thu_hoc_phi_dang_ky_id_dang_ky_id_fk" FOREIGN KEY ("dang_ky_id") REFERENCES "public"."dang_ky"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thu_lao" ADD CONSTRAINT "thu_lao_giao_vien_id_giao_vien_id_fk" FOREIGN KEY ("giao_vien_id") REFERENCES "public"."giao_vien"("id") ON DELETE restrict ON UPDATE no action;