# Simple AI Chat Application

This is a friendly chat application where you can talk to an AI. It's like ChatGPT but runs on your own computer!

## What You Need Before Starting

1. Install these programs on your computer:
   - Python (Download from https://www.python.org/downloads/)
   - Node.js (Download from https://nodejs.org/)
   - Ollama (Download from https://ollama.ai/)

2. After installing Ollama, open Command Prompt (Windows) or Terminal (Mac/Linux) and run:
   ```
   ollama pull llama3.2
   ```
   This downloads the AI model we'll use (it might take a few minutes).

## Step-by-Step Setup Guide

1. Download this project:
   - Click the green "Code" button at the top of this page
   - Choose "Download ZIP"
   - Extract the ZIP file somewhere on your computer

2. Set up the backend (the part that talks to the AI):
   - Open Command Prompt (Windows) or Terminal (Mac/Linux)
   - Navigate to where you extracted the files (use the 'cd' command)
   - Install Flask by typing:
     ```
     pip install flask flask-cors
     ```
   - Start the backend server:
     ```
     python server.py
     ```
   - Keep this window open!

3. Set up the frontend (the chat interface):
   - Open a new Command Prompt or Terminal window
   - Navigate to the frontend folder inside the project:
     ```
     cd frontend
     ```
   - Install the required files:
     ```
     npm install
     ```
   - Start the chat interface:
     ```
     npm start
     ```
   - A browser window should open automatically to http://localhost:3000

## How to Use the Chat

1. Make sure both the backend (python server.py) and frontend (npm start) are running
2. Type your message in the box at the bottom of the screen
3. Press Enter or click the Send button
4. Wait for the AI to respond (it might take a few seconds)

## Common Problems and Solutions

If the chat isn't working:
- Make sure both Command Prompt/Terminal windows are still open and running
- Check that you installed all the programs in the "What You Need" section
- Make sure you ran the `ollama pull llama3.2` command
- Try refreshing your browser page
- If nothing works, close everything and start over from step 2 of the setup guide

## Need More Help?

If you're stuck, try these steps:
1. Close all Command Prompt/Terminal windows
2. Close your browser
3. Start fresh with the backend setup (Step 2)
4. Then do the frontend setup (Step 3)
5. If you still have problems, ask for help from someone who knows about computers!

## Features You Can Try

- Type messages and chat with the AI
- Start new conversations using the sidebar
- Use the microphone button to speak instead of type (works in most browsers)
- Attach files using the file button
- Share your conversations by clicking the share button
- Your chat history is saved automatically

The chat works on phones and tablets too!
