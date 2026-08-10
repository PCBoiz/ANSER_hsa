ALTER TABLE "bac_thue_tncn" ADD COLUMN "da_duyet" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bac_thue_tncn" ADD COLUMN "duyet_boi_id" uuid;--> statement-breakpoint
ALTER TABLE "bac_thue_tncn" ADD COLUMN "duyet_luc" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tham_so_phap_ly" ADD COLUMN "da_duyet" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tham_so_phap_ly" ADD COLUMN "duyet_boi_id" uuid;--> statement-breakpoint
ALTER TABLE "tham_so_phap_ly" ADD COLUMN "duyet_luc" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bac_thue_tncn" ADD CONSTRAINT "bac_thue_duyet_du_dau_vet" CHECK ("bac_thue_tncn"."da_duyet" = false or ("bac_thue_tncn"."duyet_luc" is not null and "bac_thue_tncn"."duyet_boi_id" is not null));--> statement-breakpoint
ALTER TABLE "tham_so_phap_ly" ADD CONSTRAINT "tham_so_duyet_du_dau_vet" CHECK ("tham_so_phap_ly"."da_duyet" = false or ("tham_so_phap_ly"."duyet_luc" is not null and "tham_so_phap_ly"."duyet_boi_id" is not null));