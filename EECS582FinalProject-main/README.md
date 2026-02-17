# TeamHub - Group Project Evaluator

A full-stack application for team productivity and project management with complete authentication and authorization.

## Features

### Authentication
- **Email/Password Authentication** - Secure user registration and login
- **JWT Token-based Auth** - Stateless authentication with access and refresh tokens
- **Remember Me** - Extended session support (30 days)
- **Password Reset** - Complete forgot/reset password flow
- **Protected Routes** - All pages require authentication

### Authorization
- **User Data Isolation** - Users can only access their own data
- **Task Ownership** - Full read/write access to own tasks
- **Group Permissions**:
  - **Owner**: Full read/write access, can delete group
  - **Members**: Read-only access
- **Join Codes** - Unique 8-character codes to join groups

### Core Features
- **Dashboard** - Overview of tasks, groups, and statistics
- **Tasks** - Create, manage, and track task progress (BACKLOG/TODO/IN_PROGRESS/DONE)
- **Groups** - Create groups with auto-generated join codes
- **Profile** - Update name and change password
- **Audit Trail** - Activity logging
- **Contribution Logs** - Sprint tracking
- **Settings** - User preferences

##  Tech Stack

### Backend
- **Django 5.0** - Python web framework
- **Django REST Framework** - RESTful API
- **SimpleJWT** - JWT authentication
- **SQLite** - Database (easily switchable to PostgreSQL)
- **CORS Headers** - Cross-origin support

### Frontend
- **React 18** - UI framework
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Styling
- **Context API** - State management

## Installation

### Prerequisites
- Python 3.10+
- Node.js 16+
- npm or yarn

### Backend Setup

```bash
# Navigate to backend directory
cd backend/groupProjectEvaluator

# Create and activate virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start the server
python manage.py runserver 0.0.0.0:8000
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend/teamhub-frontend

# Install dependencies
npm install

# Start the development server
npm start
```

