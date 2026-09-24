# Dockerfile
# -----------------------------------------------------------------------------
# FOLKSDO IAM™ PRODUCTION IMAGE
# -----------------------------------------------------------------------------
# Build context contract:
#   folksdo-engine/
#   folksdo-services/folksdo-platform/
#   folksdo-services/folksdo-identity-access/
# -----------------------------------------------------------------------------

FROM node:22-bookworm-slim AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.5.2 --activate
WORKDIR /workspace
COPY folksdo-engine ./folksdo-engine
COPY folksdo-services/folksdo-platform ./folksdo-services/folksdo-platform
COPY folksdo-services/folksdo-identity-access ./folksdo-services/folksdo-identity-access
WORKDIR /workspace/folksdo-services/folksdo-identity-access
RUN pnpm install --frozen-lockfile
RUN pnpm --dir ../../folksdo-engine build:ordered
RUN pnpm --dir ../folksdo-platform build
RUN pnpm build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@11.5.2 --activate
WORKDIR /workspace
COPY --from=build /workspace /workspace
WORKDIR /workspace/folksdo-services/folksdo-identity-access
EXPOSE 3100
CMD ["pnpm", "--filter", "@folksdo-identity-access/server", "start"]
