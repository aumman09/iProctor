FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# build ต้องมี DATABASE_URL (โมดูล db ตรวจตอน import) — ค่าจริงมาจาก compose ตอนรัน, postgres.js เชื่อมต่อแบบ lazy
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
RUN npm run build

# ใช้รัน migrate / โหลดผัง / seed (ต้องมี devDependencies: tsx)
FROM build AS tools
ENV TZ=Asia/Bangkok
RUN touch .env
CMD ["sh", "-c", "npm run db:migrate && npm run db:layouts && npm run db:seed"]

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 TZ=Asia/Bangkok
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# ไฟล์ผังห้อง (data/seating) อ่านด้วย fs ตอนรัน — ไม่ถูก trace เข้า standalone จึงคัดลอกเอง
COPY --from=build /app/data ./data
USER node
EXPOSE 3000
CMD ["node", "server.js"]
