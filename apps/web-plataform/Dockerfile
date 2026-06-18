FROM node:20-alpine

WORKDIR /app

# Enable pnpm via Corepack and pin a Node 20 compatible version
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Install dependencies based on the available lockfile
RUN if [ -f pnpm-lock.yaml ]; then \
    pnpm install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then \
    npm ci; \
  else \
    npm install; \
  fi

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000

CMD ["pnpm", "dev", "--hostname", "0.0.0.0"]
