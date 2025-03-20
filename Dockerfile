# Use a Debian-based Node.js image
FROM node:18

# Install required system libraries
RUN apt-get update && apt-get install -y \
    openssl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install && npm ci --omit=dev && npm cache clean --force

# Remove CLI packages if not needed
RUN npm remove @shopify/cli

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Start the application
CMD ["npm", "run", "docker-start"]