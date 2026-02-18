FROM node:22-bullseye

# Install Python for parsers
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies
COPY requirements.txt ./requirements.txt
RUN pip3 install --no-cache-dir -r requirements.txt

# App source
COPY . .

# Build Next.js UI in production mode
WORKDIR /app/ui
RUN npm install && npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]

