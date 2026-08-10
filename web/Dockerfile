# ════════════════════════════════════════════════════════════════════════════
#  ANSER-HSA — ảnh chạy
#
#  Dùng Debian slim chứ không phải Alpine. Next kéo theo `sharp` (kèm `@img/*`)
#  dù dự án không dùng `next/image` — bản dựng sẵn cho glibc là bản được hỗ trợ
#  tốt nhất, còn musl trên ARM64 là chỗ hay vỡ. Máy ảo miễn phí của Oracle là
#  ARM64, nên đây không phải chuyện giả định.
#
#  Ba tầng để lớp phụ thuộc được dùng lại: sửa mã nguồn thì không cài lại npm.
# ════════════════════════════════════════════════════════════════════════════

# ─── tầng 1: phụ thuộc ──────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ─── tầng 2: dựng ───────────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Không truyền DATABASE_URL hay JWT_SECRET vào đây, và cũng KHÔNG CẦN: kết nối
# database mở lười (xem src/server/db/client.ts) nên bản dựng không đòi khoá của
# môi trường chạy. Nếu lệnh dưới đây bắt đầu đòi biến môi trường thì đó là dấu
# hiệu có ai đó vừa đưa lời gọi DB lên tầng module — sửa chỗ đó, đừng truyền khoá.
RUN npm run build

# ─── tầng 3: chạy ───────────────────────────────────────────────────────────
FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 anser \
 && useradd --system --uid 1001 --gid anser anser

# `standalone` đã gồm server.js và đúng những gói cần thiết. Hai thứ nó KHÔNG
# tự mang theo là `.next/static` và `public` — thiếu là trang lên nhưng mất sạch
# CSS, và đó là lỗi kinh điển của cách đóng gói này.
COPY --from=builder --chown=anser:anser /app/.next/standalone ./
COPY --from=builder --chown=anser:anser /app/.next/static ./.next/static
COPY --from=builder --chown=anser:anser /app/public ./public

USER anser
EXPOSE 3000

# Dùng chính fetch của Node — ảnh slim không có curl hay wget.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
