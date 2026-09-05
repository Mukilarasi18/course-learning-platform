# LMS Platform — One-Service Deployment

This project is configured so the frontend and backend run together as one website.

## What happens during deployment
1. The React/Vite frontend is built into `frontend/dist`.
2. The Node/Express backend starts normally.
3. Express serves the React website and the `/api` backend from the same domain.

No separate frontend URL and backend URL are needed.

## Recommended simple deployment
Deploy the entire repository as ONE Node.js Web Service on Render.

Build Command: `npm run build`

Start Command: `npm start`

The root directory should be the project root.

## Important note about SQLite
The project uses a local SQLite database. Some cloud free tiers have temporary storage, so database data and uploaded files may not survive redeploys or restarts. For permanent production use, persistent storage and a hosted database are recommended.
