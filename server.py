from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os
from werkzeug.utils import secure_filename
import sqlite3
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'doc', 'docx'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def init_db():
    conn = sqlite3.connect('chat_history.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS chats
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  prompt TEXT NOT NULL,
                  response TEXT NOT NULL,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
    conn.commit()
    conn.close()

def query_ollama(prompt):
    try:
        result = subprocess.run(
            ["ollama", "run", "llama3.2", prompt],
            capture_output=True,
            text=True,
            encoding="utf-8"
        )
        return result.stdout.strip()
    except Exception as e:
        return str(e)

@app.route("/upload", methods=["POST"])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        return jsonify({"message": "File uploaded successfully", "filename": filename})
    return jsonify({"error": "File type not allowed"}), 400

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    prompt = data.get("prompt", "")
    response = query_ollama(prompt)
    
    # Save chat to database
    conn = sqlite3.connect('chat_history.db')
    c = conn.cursor()
    c.execute("INSERT INTO chats (prompt, response) VALUES (?, ?)", (prompt, response))
    conn.commit()
    conn.close()
    
    return jsonify({"response": response})

@app.route("/history", methods=["GET"])
def get_history():
    conn = sqlite3.connect('chat_history.db')
    c = conn.cursor()
    c.execute("SELECT * FROM chats ORDER BY timestamp DESC")
    chats = [{"id": row[0], "prompt": row[1], "response": row[2], "timestamp": row[3]} 
             for row in c.fetchall()]
    conn.close()
    return jsonify({"chats": chats})

if __name__ == "__main__":
    init_db()
    app.run(debug=True)
