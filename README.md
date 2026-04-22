# Screamer 📢

A Twitter-like social media platform where users can "scream into the void" and interact with others.

## Features

- User authentication (register, login, logout)
- Create, edit, and delete screams (posts)
- Like and comment on screams
- Follow/unfollow other users
- View global feed or personalized following feed
- User profiles with statistics
- Real-time social interactions

## Technology Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Node.js, TypeScript
- **Database**: SQLite (server-side)
- **API Documentation**: OpenAPI v3 with Stoplight Elements

## Getting Started

### Development

```bash
nvm install 20
nvm use 20
npm install
npm run dev
```

Visit http://localhost:3000

### Production

```bash
npm install
npm run build
npm start
```

### Docker

```bash
docker-compose up --build
```

## API Documentation

Visit http://localhost:3000/docs to view the interactive API documentation.

## Database Schema

- **accounts**: User accounts with authentication
- **posts**: User screams/posts
- **comments**: Comments on posts
- **likes**: Post likes
- **followers**: Follow relationships

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)
- `JWT_SECRET`: Secret key for JWT tokens
- `FLAG`: CTF flag for security challenges

## Security Note

This application includes intentionally vulnerable endpoints at `/api/ops/internal/*` protected only by HTTP Basic Authentication for security testing purposes.
