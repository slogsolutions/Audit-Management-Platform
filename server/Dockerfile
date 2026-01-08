FROM node:18-slim

WORKDIR /app

ENV NODE_ENV=production

# Install deps first (better cache)
COPY package*.json ./
RUN npm install --only=production

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy rest of the app
COPY . .

EXPOSE 5012

CMD ["node", "index.js"]
