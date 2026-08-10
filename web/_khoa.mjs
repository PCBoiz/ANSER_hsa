import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
const sql = neon(readFileSync(".env.local","utf8").match(/^DATABASE_URL=(.+)$/m)[1].trim());
const u = await sql`select id from nguoi_dung limit 1`;
await sql`insert into ky_ke_toan (ky, trang_thai, khoa_luc, khoa_boi_id)
          values ('2026-07','da_khoa', now(), ${u[0].id})
          on conflict (ky) do update set trang_thai='da_khoa', khoa_luc=now(), khoa_boi_id=${u[0].id}`;
console.log("  đã khoá kỳ 2026-07");
