import os
import sqlite3
import re 
import io              
import base64          
from PIL import Image
from dotenv import load_dotenv
import google.generativeai as genai
from flask import Flask, request, jsonify, send_from_directory, session

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SYSTEM_PROMPT = os.getenv("SYSTEM_PROMPT")

if not SECRET_KEY or not GEMINI_API_KEY:
    raise ValueError("Error: GEMINI_API_KEY and SECRET_KEY must be set in your .env file.")

genai.configure(api_key=GEMINI_API_KEY)

chat_model = genai.GenerativeModel("gemini-2.5-flash", system_instruction=SYSTEM_PROMPT)

DB_PATH = "chat_history.db"
conn = sqlite3.connect(DB_PATH, check_same_thread=False)
cur = conn.cursor()
cur.execute("CREATE TABLE IF NOT EXISTS conversations (id INTEGER PRIMARY KEY, user_id TEXT, role TEXT, content TEXT)")
conn.commit()

def save_message(user_id, role, content):
    cur.execute("INSERT INTO conversations (user_id, role, content) VALUES (?, ?, ?)", (user_id, role, content))
    conn.commit()

def load_history(user_id, limit=10):
    cur.execute("SELECT role, content FROM conversations WHERE user_id = ? ORDER BY id DESC LIMIT ?", (user_id, limit))
    rows = cur.fetchall()
    return [{"role": r, "parts": [c]} for r, c in reversed(rows)]

app = Flask(__name__)
app.secret_key = SECRET_KEY

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/clear_history', methods=['POST'])
def clear_history():
    if 'user_id' in session:
        user_id = session['user_id']
        cur.execute("DELETE FROM conversations WHERE user_id = ?", (user_id,))
        conn.commit()
        return jsonify({'status': 'success'}), 200
    return jsonify({'status': 'error'}), 400

@app.route('/chat', methods=['POST'])
def chat():
    try:
        if 'user_id' not in session:
            session['user_id'] = os.urandom(16).hex()
        user_id = session['user_id']

        data = request.json
        user_message = data.get('message', '')
        image_data_url = data.get('image_data')

        if not user_message and not image_data_url:
            return jsonify({'error': 'Empty message.'}), 400

        prompt_parts = []
        if image_data_url:
            match = re.match(r"data:(image/.+);base64,(.+)", image_data_url)
            mime_type, base64_data = match.groups()
            image_part = {"inline_data": {"mime_type": mime_type, "data": base64.b64decode(base64_data)}}
            prompt_parts.append(image_part)
        
        if user_message:
            prompt_parts.append(user_message)

        history = load_history(user_id)
        conversation = chat_model.start_chat(history=history)

        response = conversation.send_message(prompt_parts)
        ai_response = response.text

        save_message(user_id, "user", user_message or "[Image Uploaded]")
        save_message(user_id, "model", ai_response)

        return jsonify({'reply': ai_response})
    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({'error': 'Server error.'}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)

