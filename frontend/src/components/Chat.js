import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  FaMicrophone, FaMicrophoneSlash, FaPaperPlane, 
  FaPlus, FaFile, FaImage, FaTrash, FaShare,
  FaBars, FaTimes
} from 'react-icons/fa';
import './Chat.css';

function Chat() {
  const [conversations, setConversations] = useState([
    { id: 'default', title: 'New Chat', messages: [] }
  ]);
  const [activeConversation, setActiveConversation] = useState('default');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Speech recognition setup
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;
  
  if (recognition) {
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      setInput(transcript);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };
  }
  
  // Handle window resize for responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      setShowSidebar(window.innerWidth > 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [conversations]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Save conversations to localStorage
  useEffect(() => {
    const savedConversations = localStorage.getItem('chatConversations');
    if (savedConversations) {
      setConversations(JSON.parse(savedConversations));
    }
  }, []);
  
  useEffect(() => {
    localStorage.setItem('chatConversations', JSON.stringify(conversations));
  }, [conversations]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message to current conversation
    const userMessage = { text: input, sender: 'user', timestamp: new Date().toISOString() };
    
    // Update the conversations state
    const updatedConversations = conversations.map(conv => {
      if (conv.id === activeConversation) {
        // Update conversation title if it's the first message
        const title = conv.messages.length === 0 ? input.slice(0, 30) : conv.title;
        return {
          ...conv,
          title: title,
          messages: [...conv.messages, userMessage]
        };
      }
      return conv;
    });
    
    setConversations(updatedConversations);
    setInput('');
    setIsLoading(true);

    try {
      // Send request to backend
      const response = await axios.post('http://localhost:5000/chat', {
        prompt: input
      });
      
      // Add bot response to current conversation
      const botMessage = { 
        text: response.data.response, 
        sender: 'bot', 
        timestamp: new Date().toISOString() 
      };
      
      setConversations(prevConversations => 
        prevConversations.map(conv => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              messages: [...conv.messages, botMessage]
            };
          }
          return conv;
        })
      );
    } catch (error) {
      console.error('Error:', error);
      
      // Add error message to current conversation
      const errorMessage = { 
        text: 'Sorry, there was an error processing your request.', 
        sender: 'bot', 
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      setConversations(prevConversations => 
        prevConversations.map(conv => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              messages: [...conv.messages, errorMessage]
            };
          }
          return conv;
        })
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNewChat = () => {
    const newId = `chat-${Date.now()}`;
    setConversations([
      ...conversations,
      { id: newId, title: 'New Chat', messages: [] }
    ]);
    setActiveConversation(newId);
    
    // On mobile, close the sidebar after creating a new chat
    if (window.innerWidth <= 768) {
      setShowSidebar(false);
    }
  };
  
  const handleDeleteChat = (id) => {
    const updatedConversations = conversations.filter(conv => conv.id !== id);
    setConversations(updatedConversations);
    
    // If we deleted the active conversation, set a new active one
    if (id === activeConversation && updatedConversations.length > 0) {
      setActiveConversation(updatedConversations[0].id);
    } else if (updatedConversations.length === 0) {
      // If no conversations left, create a new one
      handleNewChat();
    }
  };
  
  const toggleVoiceInput = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };
  
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Create a message with file info
    const fileMessage = { 
      text: `Attached file: ${file.name}`, 
      sender: 'user',
      timestamp: new Date().toISOString(),
      fileInfo: {
        name: file.name,
        type: file.type,
        size: file.size
      }
    };
    
    // Add file message to current conversation
    setConversations(prevConversations => 
      prevConversations.map(conv => {
        if (conv.id === activeConversation) {
          return {
            ...conv,
            messages: [...conv.messages, fileMessage]
          };
        }
        return conv;
      })
    );
    
    // In a real app, you would upload the file to your server here
    // For now, we'll just add a mock response
    setTimeout(() => {
      const botResponse = { 
        text: `I've received your file: ${file.name}. What would you like me to do with it?`, 
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      
      setConversations(prevConversations => 
        prevConversations.map(conv => {
          if (conv.id === activeConversation) {
            return {
              ...conv,
              messages: [...conv.messages, botResponse]
            };
          }
          return conv;
        })
      );
    }, 1000);
  };
  
  const handleShareConversation = () => {
    // In a real app, you would generate a shareable link
    // For now, we'll just copy the conversation to clipboard
    const currentConv = conversations.find(conv => conv.id === activeConversation);
    if (!currentConv) return;
    
    const conversationText = currentConv.messages
      .map(msg => `${msg.sender === 'user' ? 'You' : 'AI'}: ${msg.text}`)
      .join('\n\n');
    
    navigator.clipboard.writeText(conversationText)
      .then(() => {
        alert('Conversation copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy conversation: ', err);
      });
  };
  
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };
  
  // Get current conversation
  const currentConversation = conversations.find(conv => conv.id === activeConversation) || conversations[0];
  const currentMessages = currentConversation ? currentConversation.messages : [];

  return (
    <div className="chat-app">
      {/* Mobile sidebar toggle button */}
      <button 
        className="mobile-sidebar-toggle" 
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        {showSidebar ? <FaTimes /> : <FaBars />}
      </button>
      
      {/* Sidebar */}
      <div className={`sidebar ${showSidebar ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={handleNewChat}>
            <FaPlus /> New Chat
          </button>
          <button 
            className="toggle-sidebar-btn" 
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            {showSidebar ? '←' : '→'}
          </button>
        </div>
        <div className="conversations-list">
          {conversations.map(conv => (
            <div 
              key={conv.id} 
              className={`conversation-item ${conv.id === activeConversation ? 'active' : ''}`}
              onClick={() => {
                setActiveConversation(conv.id);
                // On mobile, close the sidebar after selecting a conversation
                if (window.innerWidth <= 768) {
                  setShowSidebar(false);
                }
              }}
            >
              <span className="conversation-title">{conv.title}</span>
              <button 
                className="delete-conversation-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteChat(conv.id);
                }}
                aria-label="Delete conversation"
              >
                <FaTrash />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="chat-container">
        <div className="chat-header">
          <h2>{currentConversation.title}</h2>
          <button 
            className="share-btn" 
            onClick={handleShareConversation}
            aria-label="Share conversation"
          >
            <FaShare /> Share
          </button>
        </div>
        
        <div className="messages-container">
          {currentMessages.length === 0 ? (
            <div className="empty-chat">
              <p>Start a conversation with the AI!</p>
              <p>Ask a question or share a file to begin.</p>
            </div>
          ) : (
            currentMessages.map((message, index) => (
              <div key={index} className={`message ${message.sender} ${message.isError ? 'error' : ''}`}>
                <div className="message-bubble">
                  {message.fileInfo ? (
                    <div className="file-attachment">
                      <div className="file-icon">
                        {message.fileInfo.type.includes('image') ? <FaImage /> : <FaFile />}
                      </div>
                      <div className="file-info">
                        <div className="file-name">{message.fileInfo.name}</div>
                        <div className="file-size">{(message.fileInfo.size / 1024).toFixed(2)} KB</div>
                      </div>
                    </div>
                  ) : (
                    message.text
                  )}
                </div>
                <div className="message-timestamp">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="message bot">
              <div className="message-bubble loading">
                <div className="dot-typing"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <form className="input-form" onSubmit={handleSubmit}>
          <div className="input-actions">
            <button 
              type="button" 
              className="file-upload-btn"
              onClick={() => fileInputRef.current.click()}
              aria-label="Upload file"
            >
              <FaFile />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileUpload}
              aria-label="File input"
            />
            <button 
              type="button" 
              className={`voice-input-btn ${isListening ? 'active' : ''}`}
              onClick={toggleVoiceInput}
              aria-label={isListening ? "Stop voice input" : "Start voice input"}
            >
              {isListening ? <FaMicrophoneSlash /> : <FaMicrophone />}
            </button>
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message here..."
            disabled={isLoading}
            aria-label="Message input"
          />
          <button 
            type="submit" 
            className="send-btn"
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            <FaPaperPlane />
          </button>
        </form>
      </div>
    </div>
  );
}

export default Chat; 