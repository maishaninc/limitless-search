FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Build application
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Accept build arguments for environment variables
# ARG NEXT_PUBLIC_API_BASE
# ARG NEXT_PUBLIC_TURNSTILE_TTL_SECONDS

# Set environment variables during build
# ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
# ENV NEXT_PUBLIC_TURNSTILE_TTL_SECONDS=$NEXT_PUBLIC_TURNSTILE_TTL_SECONDS

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3200
ENV HOSTNAME=0.0.0.0

# Copy standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3200

CMD ["node", "server.js"]
