ALTER TABLE "doanh_thu_phan_loai" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "doanh_thu_phan_loai" CASCADE;--> statement-breakpoint
ALTER TABLE "khop_thu" DROP CONSTRAINT "khop_thu_thu_hoc_phi_id_thu_hoc_phi_id_fk";
--> statement-breakpoint
ALTER TABLE "khop_thu" DROP COLUMN "thu_hoc_phi_id";