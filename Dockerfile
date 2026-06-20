# Use Node.js 18 (or whichever version you are currently using)
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your app's source code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port Cloud Run expects
EXPOSE 8080
ENV PORT=8080

# Start the application
CMD ["npm", "start"]
