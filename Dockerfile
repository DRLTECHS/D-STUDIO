FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev --no-fund --no-audit

COPY . .

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --retries=5 --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "start"]
