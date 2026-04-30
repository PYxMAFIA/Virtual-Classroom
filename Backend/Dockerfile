FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies (only production dependencies)
RUN npm install --omit=dev

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on (adjust if your app uses a different port)
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]
