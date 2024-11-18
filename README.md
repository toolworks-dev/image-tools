# Image Tools

A web application for converting, resizing, and compressing images between different formats

https://imagetools.toolworks.dev

## Features

- Convert images
- Resize images
- Compress images
- Scale images by percentage
- Set custom dimensions

## Tech Stack

- React with TypeScript
- Material-UI (MUI) for components
- Sharp for image processing
- Express.js backend
- Bun runtime
- Docker support

## Getting Started

### Prerequisites

```sh
node
bun
docker (optional)
```

#### Docker

```bash
git clone https://github.com/toolworks-dev/image-tools.git
cd image-tools
docker compose up -d --build
```

#### Bun/Node

```bash
sudo npm install -g bun
git clone https://github.com/toolworks-dev/image-tools.git
cd image-tools
bun install
bun run build
bun run start:server
```