# app.py

import os
import sqlite3
import re 
from dotenv import load_dotenv
import google.generativeai as genai
from flask import Flask, request, jsonify, send_from_directory, session

# --- Load Environment Variables ---
load_dotenv()

# --- Configuration ---
SECRET_KEY = os.getenv("SECRET_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not SECRET_KEY or not GEMINI_API_KEY:
    raise ValueError("Error: GEMINI_API_KEY and SECRET_KEY must be set in your .env file.")

# --- Gemini AI Configuration ---
genai.configure(api_key=GEMINI_API_KEY)
# System prompt for the public-facing chatbot
SYSTEM_PROMPT = os.getenv("SYSTEM_PROMPT")

model = genai.GenerativeModel("Gemini 2.5 Flash-Lite", system_instruction=SYSTEM_PROMPT)

# --- Database Setup ---
DB_PATH = "chat_history.db"
conn = sqlite3.connect(DB_PATH, check_same_thread=False)
cur = conn.cursor()
cur.execute("""
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT, -- Changed to TEXT for session IDs
    role TEXT,
    content TEXT
)
""")
conn.commit()

def save_message(user_id, role, content):
    cur.execute("INSERT INTO conversations (user_id, role, content) VALUES (?, ?, ?)",
                (user_id, role, content))
    conn.commit()

def load_history(user_id, limit=10):
    cur.execute("SELECT role, content FROM conversations WHERE user_id = ? ORDER BY id DESC LIMIT ?",
                (user_id, limit))
    rows = cur.fetchall()
    # The Gemini API expects the list to be in chronological order (oldest first)
    return [{"role": r, "parts": [c]} for r, c in reversed(rows)]

# --- Flask App Initialization ---
app = Flask(__name__)
app.secret_key = SECRET_KEY

# --- Flask Routes ---

@app.route('/')
def index():
    """Serves the main index.html file."""
    return send_from_directory('.', 'index.html')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        if 'user_id' not in session:
            session['user_id'] = os.urandom(16).hex()
        user_id = session['user_id']

        data = request.json
        user_message = data.get('message', '') # Message can be empty for an image
        image_data_url = data.get('image_data')

        if not user_message and not image_data_url:
            return jsonify({'error': 'Message or image cannot be empty.'}), 400

        # Prepare the content for the Gemini API
        prompt_parts = [user_message]

        if image_data_url:
            # Parse the Base64 Data URL (e.g., "data:image/jpeg;base64,iVBORw...")
            match = re.match(r"data:(image/.+);base64,(.+)", image_data_url)
            if not match:
                return jsonify({'error': 'Invalid image data URL format.'}), 400

            mime_type = match.group(1)
            base64_data = match.group(2)

            image_part = {
                "inline_data": {
                    "mime_type": mime_type,
                    "data": base64_data
                }
            }
            prompt_parts.append(image_part)

        # Load history, start chat, and send message
        history = load_history(user_id)
        conversation = model.start_chat(history=history)

        response = conversation.send_message(prompt_parts)
        ai_response = response.text

        # Save messages to the database
        save_message(user_id, "user", user_message or "[Image Uploaded]")
        save_message(user_id, "model", ai_response)

        return jsonify({'reply': ai_response})

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({'error': 'An error occurred while processing your request.'}), 500

if __name__ == '__main__':

    app.run(port=5000, debug=True)
