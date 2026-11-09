TeamFlow

A lightweight team collaboration and task management application built with React, Express, and MongoDB.

TeamFlow helps small teams organize their work through shared workspaces, projects, and task boards.

Features
Authentication: User registration, login, and logout.
Workspaces: Create and switch between workspaces.
Team Management: Add and remove existing TeamFlow users from workspaces.
Project Management: Create and organize projects within workspaces.
Task Management: Create, edit, delete, and manage tasks.
Kanban Board: Track tasks through To Do, In Progress, and Done stages.
Task Assignment: Assign tasks to workspace members.
Priority Management: Set Low, Medium, or High priority.
Due Dates: Set and track task deadlines.
Task Filtering: Filter tasks by status and assignee.
Theme Support: Switch between light and dark themes.
Technology Stack
Area	Technology
Frontend	React 19, Vite, JavaScript
Backend	Node.js, Express 5
Database	MongoDB, Mongoose
Authentication	JWT, bcryptjs, HTTP-only cookies
Validation	Zod
Project Structure
text
TeamFlow/
├── client/                 # React frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
├── server/                 # Express backend
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── models/
│   │   └── routes/
│   ├── .env.example
│   └── package.json
│
├── package.json
└── README.md

Requirements
Node.js 20.19+ or 22.12+
MongoDB (local or hosted)
Getting Started
1. Clone the repository
bash
git clone https://github.com/PatilAdhiraj/TeamFlow.git
cd TeamFlow

2. Install dependencies

Install frontend dependencies:

bash
cd client
npm install


Install backend dependencies:

bash
cd ../server
npm install

3. Configure environment variables

Copy the example environment file:

bash
cp .env.example .env


Run this command from the server directory.

Configure the following variables in server/.env:

MONGODB_URI – MongoDB connection string.
CLIENT_ORIGIN – Frontend origin.
JWT_SECRET – A strong random secret of at least 32 characters.

For the frontend, create client/.env only if you need to configure VITE_API_URL for a different API address.

Never commit actual environment files or credentials.

4. Start the application

Start the backend in one terminal:

bash
cd server
npm run dev


Start the frontend in another terminal:

bash
cd client
npm run dev


By default:

Frontend: http://localhost:5173
Backend: http://localhost:4000

Open the frontend URL in your browser.

5. Run checks

From the project root:

bash
npm run test:api
npm run lint
npm run build

Security
Passwords are hashed using bcrypt.
Authentication uses signed JWTs stored in HTTP-only, same-site cookies.
Mutating requests are restricted to the configured frontend origin.
CORS allows credentialed requests from the configured origin.
Project and task access is checked against workspace membership.
Workspace owners can manage workspace membership.
Members can create and manage workspace projects and tasks.
Removing a workspace member unassigns their workspace tasks.

Email delivery, invitation links, and workspace ownership transfer are not included in the current MVP.

Application Settings

The Settings section provides:

Signed-in account information.
Active workspace information.
Workspace role.
Light and dark theme preferences.
TeamFlow MVP information.

Theme preferences are saved in the browser's local storage.

Workspace, project, member, and task data refresh automatically every 15 seconds while the application is open. Returning to the browser tab also triggers an immediate refresh.

Deployment

For production deployment:

Serve the frontend and backend on the same site where possible.
Configure a strong, randomly generated JWT_SECRET.
Set NODE_ENV=production.
Configure a production MongoDB connection string.
Set the correct frontend origin.
Keep all credentials and secrets outside the public repository.
Author

PatilAdhiraj