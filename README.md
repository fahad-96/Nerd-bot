# NerdChat - AI Chat Application with Authentication

A full-stack chat application with Google OAuth integration and multiple AI models.

## Features

- 🔐 **Authentication System**: Email/password and Google OAuth sign-in
- 🤖 **Multiple AI Models**: Choose from different AI personalities
- 💬 **Real-time Chat**: Smooth transitions and message history
- 📱 **Responsive Design**: Works on desktop and mobile
- 🎨 **Modern UI**: Glassmorphism design with smooth animations

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with:

```
SECRET_KEY=your_secret_key_for_jwt_tokens
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_client_id
SYSTEM_PROMPT=your_system_prompt
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Sign-In API
4. Create OAuth 2.0 credentials
5. Add your domain to authorized origins
6. Copy the Client ID to your `.env` file

### 4. Run the Application

```bash
python app.py
```

The application will be available at `http://localhost:5000`

## File Structure

```
for netlify/
├── app.py              # Flask backend with authentication
├── index.html          # Complete frontend application
├── requirements.txt    # Python dependencies
├── .env               # Environment variables
├── .env.example       # Environment template
└── README.md          # This file
```

## API Endpoints

### Authentication
- `POST /auth/signup` - Create new account
- `POST /auth/signin` - Sign in with email/password
- `POST /auth/google` - Sign in with Google OAuth
- `POST /auth/signout` - Sign out

### Chat
- `POST /chat/{model_id}` - Send message to specific AI model
  - Models: `nerd-girl`, `nerd-boy`, `chodu-doctor`, `chodu-engineer`

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    google_id TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Conversations Table
```sql
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    model_id TEXT NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## Frontend Features

- **AuthManager**: Handles sign-in/sign-up and Google OAuth
- **NerdChat**: Manages chat functionality and model selection
- **Responsive Design**: Mobile-friendly interface
- **Real-time Feedback**: Loading states and error handling

## Security Features

- Password hashing with SHA-256
- JWT token authentication
- Google OAuth2 verification
- Session-based authentication
- Protected API endpoints

## Development

The application uses:
- **Backend**: Flask with SQLite database
- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Authentication**: Google OAuth2 + email/password
- **AI Integration**: Google Gemini API
- **Styling**: CSS3 with glassmorphism effects

## Deployment

For production deployment:
1. Set `FLASK_ENV=production` in `.env`
2. Use a production WSGI server like Gunicorn
3. Configure proper Google OAuth origins
4. Use a production database (PostgreSQL recommended)

## Troubleshooting

### Google Sign-In Not Working
- Check GOOGLE_CLIENT_ID is correctly set
- Verify domain is added to Google OAuth origins
- Check browser console for errors

### Database Issues
- Ensure app.py has write permissions
- Check if database file exists and is accessible
- Verify database schema is created

### API Errors
- Check GEMINI_API_KEY is valid
- Verify network connectivity
- Check server logs for detailed errors
