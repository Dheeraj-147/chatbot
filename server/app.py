from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Database initialization
def init_db():
    conn = sqlite3.connect('chat.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS conversations
        (id TEXT PRIMARY KEY,
         title TEXT,
         created_at TIMESTAMP)
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS messages
        (id INTEGER PRIMARY KEY AUTOINCREMENT,
         conversation_id TEXT,
         text TEXT,
         sender TEXT,
         timestamp TIMESTAMP,
         FOREIGN KEY (conversation_id) REFERENCES conversations (id))
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS memory
        (conversation_id TEXT,
         key TEXT,
         value TEXT,
         updated_at TIMESTAMP,
         PRIMARY KEY (conversation_id, key),
         FOREIGN KEY (conversation_id) REFERENCES conversations (id))
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    prompt = data.get('prompt', '')
    memory = data.get('memory', {})
    conversation_id = data.get('conversationId', 'default')
    files = data.get('files', [])

    # Store the message in the database
    conn = sqlite3.connect('chat.db')
    c = conn.cursor()
    
    # Ensure conversation exists
    c.execute('INSERT OR IGNORE INTO conversations (id, title, created_at) VALUES (?, ?, ?)',
              (conversation_id, 'New Chat', datetime.now()))
    
    # Store user message
    c.execute('''
        INSERT INTO messages (conversation_id, text, sender, timestamp)
        VALUES (?, ?, ?, ?)
    ''', (conversation_id, prompt, 'user', datetime.now()))
    
    # Update memory if provided
    for key, value in memory.items():
        c.execute('''
            INSERT OR REPLACE INTO memory (conversation_id, key, value, updated_at)
            VALUES (?, ?, ?, ?)
        ''', (conversation_id, key, value, datetime.now()))
    
    conn.commit()
    conn.close()

    # Generate response based on prompt, memory, and files
    response = generate_response(prompt, memory, files)
    
    return jsonify({
        'response': response,
        'memory': memory
    })

def generate_response(prompt, memory, files=None):
    # This is a simple example response generation
    # In a real application, you would use a more sophisticated language model
    
    # Check if it's a blog post prompt (from the screenshot example)
    if "blog post" in prompt.lower() and "llm" in prompt.lower():
        # Format the response with Markdown for blog post prompt
        response = """# Large Language Models: Benefits and Limitations

## Introduction
Large Language Models (LLMs) have rapidly emerged as a transformative force in natural language processing. These sophisticated AI systems, trained on vast datasets of text from across the internet, books, and other sources, have demonstrated remarkable capabilities in understanding and generating human-like text.

## Benefits

### Enhanced Language Understanding
LLMs excel at comprehending context, nuance, and even subtle implications in text. They can interpret complex queries and provide relevant responses that demonstrate a deep understanding of language structure and semantics.

### Versatile Generation Capabilities
From drafting emails to writing code, LLMs can generate coherent, contextually appropriate content across various domains and styles. Their ability to adapt to different tones and formats makes them invaluable for content creation tasks.

### Practical Applications
- **Customer Service**: Chatbots powered by LLMs can handle complex customer inquiries with more natural, helpful responses
- **Language Translation**: Breaking down language barriers with more accurate, context-aware translations
- **Content Creation**: Assisting with drafting articles, reports, and creative writing

## Limitations

### Data Dependency and Biases
LLMs are only as good as the data they're trained on. They can perpetuate and amplify biases present in their training data, leading to potentially problematic outputs that reflect historical inequities.

### Linguistic Understanding Challenges
Despite their sophistication, LLMs still struggle with certain language comprehension tasks:
- Detecting sarcasm and irony consistently
- Understanding cultural idioms and expressions
- Maintaining logical consistency in longer texts

### Resource Requirements
Training and running LLMs demands significant computational resources, raising concerns about energy consumption and environmental impact, as well as accessibility for smaller organizations.

## Future Directions

### Multi-modal Learning Integration
Recent advancements are focusing on combining text understanding with other forms of data such as images and audio, creating more robust models that can process information across different formats.

### Specialized Domain Adaptation
The future may see more LLMs fine-tuned for specific industries like healthcare, education, and legal services, where specialized knowledge and terminology are crucial.

*Keywords: natural language processing, language understanding, language generation, deep learning*
"""
        return response
    
    # Check if files were included
    if files and len(files) > 0:
        # Format response for files
        response = f"I've received your message"
        if prompt:
            response += f": **{prompt}**"
        
        response += f"\n\nI see you've attached {len(files)} file{'s' if len(files) > 1 else ''}: "
        response += ", ".join([f"**{file}**" for file in files])
        
        if memory:
            response += "\n\n## I remember:\n"
            for key, value in memory.items():
                response += f"- **{key}**: {value}\n"
        
        return response
    
    # Format the response with Markdown (default case)
    response = f"I received your message: **{prompt}**"
    
    if memory:
        response += "\n\n## I remember:\n"
        for key, value in memory.items():
            response += f"- **{key}**: {value}\n"
    
    return response

@app.route('/conversations', methods=['GET'])
def get_conversations():
    conn = sqlite3.connect('chat.db')
    c = conn.cursor()
    
    c.execute('''
        SELECT c.id, c.title, c.created_at,
               m.text, m.sender, m.timestamp
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        ORDER BY m.timestamp
    ''')
    
    rows = c.fetchall()
    conversations = {}
    
    for row in rows:
        conv_id, title, created_at, text, sender, timestamp = row
        if conv_id not in conversations:
            conversations[conv_id] = {
                'id': conv_id,
                'title': title,
                'created_at': created_at,
                'messages': []
            }
        
        if text and sender and timestamp:
            conversations[conv_id]['messages'].append({
                'text': text,
                'sender': sender,
                'timestamp': timestamp
            })
    
    conn.close()
    return jsonify(list(conversations.values()))

@app.route('/conversations/<conversation_id>', methods=['DELETE'])
def delete_conversation(conversation_id):
    conn = sqlite3.connect('chat.db')
    c = conn.cursor()
    
    # Delete messages
    c.execute('DELETE FROM messages WHERE conversation_id = ?', (conversation_id,))
    
    # Delete memory
    c.execute('DELETE FROM memory WHERE conversation_id = ?', (conversation_id,))
    
    # Delete conversation
    c.execute('DELETE FROM conversations WHERE id = ?', (conversation_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({'status': 'success'})

if __name__ == '__main__':
    app.run(debug=True) 