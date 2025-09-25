
ARG IMAGE=node:20-alpine

###################################### base builder Stage #############
FROM ${IMAGE} AS builder
WORKDIR /app

# Copy package.json and lock
COPY package*.json ./

# Install deps (prod or dev depending on build arg)
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
# Install dependencies
# - dev → install everything
# - test/prod → install only prod deps
RUN if [ "$NODE_ENV" = "development" ]; then \
      yarn install; \
    else \
      yarn install --only=production; \
    fi

# Copy the source code
COPY . .
# Build the app to the /dist folder
RUN yarn run build

###################################### final runtime stage #############

FROM ${IMAGE} AS runtime

WORKDIR /app
USER node
# Copy only what’s needed from builder
COPY --chown=node:node --from=builder /app/node_modules node_modules
COPY --chown=node:node --from=builder /app/dist dist

# Always expose app port
EXPOSE 3001
CMD [ "node","dist/main.js" ]




