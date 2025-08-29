ARG IMAGE=node:20-alpine
###################################### development build Stage #############
FROM ${IMAGE} as  development
WORKDIR /app
# Copy package.json and package-lock.json
COPY package*.json ./


# Install dependencies
RUN yarn install
# Copy the source code
COPY . .
#expose ports
EXPOSE 3001 9229
# Build the app to the /dist folder
RUN yarn run build

###################################### prod build Stage #############

FROM ${IMAGE} as  builder_prd

ENV NODE_ENV production
WORKDIR /app
# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN yarn install --only=production
# Copy the source code
COPY . .
RUN yarn run build
USER node

###################################### production build Stage #############
FROM ${IMAGE} AS production
ENV NODE_ENV=production
EXPOSE 3001
WORKDIR /app
COPY --chown=node:node --from=builder_prd /app/node_modules node_modules
COPY --chown=node:node --from=builder_prd /app/dist dist
COPY --chown=node:node --from=builder_prd /app/.env.production .env.production
USER node
CMD [ "node","dist/main.js" ]



