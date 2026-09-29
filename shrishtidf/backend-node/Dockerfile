FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose port (from .env)
EXPOSE 5555

# Start the application
CMD ["npm", "start"]
