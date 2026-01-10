FROM node:18-alpine

WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm install

# Copy only Prisma schema first and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Now copy the rest of the code
COPY . .

EXPOSE 5012  

 # or 3000, but match your actual server port

CMD ["npm", "start"]   

# assuming "start": "node index.js" in package.json
