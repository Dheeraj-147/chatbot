import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { 
  FaMicrophone, FaMicrophoneSlash, FaPaperPlane, 
  FaPlus, FaFile, FaImage, FaTrash, FaShare,
  FaBars, FaTimes
} from 'react-icons/fa';
import { processMemoryOperation, updateMemory, formatMemoryResponse } from '../utils/memoryManager';
import './Chat.css';

function Chat() {
  // Initialize conversations from localStorage or with default value
  const [conversations, setConversations] = useState(() => {
    const savedConversations = localStorage.getItem('chatConversations');
    return savedConversations ? JSON.parse(savedConversations) : [
      { id: 'default', title: 'New Chat', messages: [] }
    ];
  });
  
  const [activeConversation, setActiveConversation] = useState(() => {
    const savedActive = localStorage.getItem('activeConversation');
    return savedActive || 'default';
  });
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
      if (window.innerWidth > 768) {
        setShowSidebar(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [conversations]);
  
  // Save conversations and active conversation to localStorage
  useEffect(() => {
    localStorage.setItem('chatConversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('activeConversation', activeConversation);
  }, [activeConversation]);
  
  // Add memory state for the current conversation
  const [conversationMemory, setConversationMemory] = useState(() => {
    const savedMemory = localStorage.getItem('conversationMemory');
    return savedMemory ? JSON.parse(savedMemory) : {};
  });

  // Save memory to localStorage
  useEffect(() => {
    localStorage.setItem('conversationMemory', JSON.stringify(conversationMemory));
  }, [conversationMemory]);
  
  const [pendingFiles, setPendingFiles] = useState([]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() && pendingFiles.length === 0) return;

    // Create the message content
    let messageText = input.trim();
    
    // If there are files attached, include file info in message text
    if (pendingFiles.length > 0) {
      const fileNames = pendingFiles.map(f => f.name).join(', ');
      if (messageText) {
        // Combine user text with file info
        messageText = `${messageText}\n\n(Files attached: ${fileNames})`;
      } else {
        // If no text input, just mention the files
        messageText = `Files attached: ${fileNames}`;
      }
    }
    
    // Create user message with text and any file info
    const userMessage = { 
      text: messageText, 
      sender: 'user', 
      timestamp: new Date().toISOString(),
      // Include file info if any files are attached
      ...(pendingFiles.length > 0 && {
        fileInfo: pendingFiles.map(f => ({
          name: f.name,
          type: f.type,
          size: f.size
        }))
      })
    };
    
    // Update the conversations state
    const updatedConversations = conversations.map(conv => {
      if (conv.id === activeConversation) {
        // Update conversation title if it's the first message
        const title = conv.messages.length === 0 ? messageText.slice(0, 30) : conv.title;
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
    setPendingFiles([]); // Clear pending files after sending
    setIsLoading(true);

    try {
      // Process memory operation if present
      const currentMemoryForChat = conversationMemory[activeConversation] || {};
      console.log("Current memory:", currentMemoryForChat);
      
      const memoryOperation = processMemoryOperation(input, currentMemoryForChat);
      console.log("Memory operation result:", memoryOperation);
      
      let memoryResponse = null;

      if (memoryOperation) {
        // Update memory state
        const updatedMemory = updateMemory(memoryOperation, currentMemoryForChat);
        console.log("Updated memory:", updatedMemory);
        
        setConversationMemory(prev => ({
          ...prev,
          [activeConversation]: updatedMemory
        }));
        
        memoryResponse = formatMemoryResponse(memoryOperation, currentMemoryForChat);
        console.log("Memory response:", memoryResponse);
        
        // Add bot response for memory operation
        const botMessage = { 
          text: memoryResponse, 
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
        
        setIsLoading(false);
        return;
      }

      // If not a memory operation, send request to backend
      const response = await axios.post('http://localhost:5000/chat', {
        prompt: input,
        memory: currentMemoryForChat,
        conversationId: activeConversation,
        // In a real application, you would also upload the actual files here
        files: pendingFiles.length > 0 ? pendingFiles.map(f => f.name) : []
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
    setConversations(prev => [
      ...prev,
      { id: newId, title: 'New Chat', messages: [] }
    ]);
    setActiveConversation(newId);
    
    // Initialize empty memory for new chat
    setConversationMemory(prev => ({
      ...prev,
      [newId]: {}
    }));
    
    // On mobile, close the sidebar after creating a new chat
    if (window.innerWidth <= 768) {
      setShowSidebar(false);
    }
  };
  
  const handleDeleteChat = (id) => {
    setConversations(prev => {
      const updated = prev.filter(conv => conv.id !== id);
      // If we deleted the active conversation, set a new active one
      if (id === activeConversation && updated.length > 0) {
        setActiveConversation(updated[0].id);
      } else if (updated.length === 0) {
        // If no conversations left, create a new one
        const newId = `chat-${Date.now()}`;
        setActiveConversation(newId);
        return [{ id: newId, title: 'New Chat', messages: [] }];
      }
      return updated;
    });

    // Clean up memory for deleted chat
    setConversationMemory(prev => {
      const { [id]: deleted, ...rest } = prev;
      return rest;
    });
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
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Add files to pending files
    setPendingFiles(prev => [
      ...prev,
      ...files.map(file => ({
        file,
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size
      }))
    ]);
    
    // Reset file input
    e.target.value = null;
  };
  
  const removeFile = (fileId) => {
    setPendingFiles(prev => prev.filter(file => file.id !== fileId));
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
      {/* Sidebar */}
      <div className={`sidebar ${!showSidebar ? 'closed' : ''}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={handleNewChat}>
            <FaPlus /> New Chat
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
      
      {/* Menu toggle button */}
      <button 
        className="sidebar-toggle-btn" 
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        {showSidebar ? <FaTimes /> : <FaBars />}
      </button>
      
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
                    <div className="file-attachments">
                      {Array.isArray(message.fileInfo) ? (
                        // Multiple files
                        <>
                          <ReactMarkdown>{message.text}</ReactMarkdown>
                          <div className="files-count">{message.fileInfo.length} file{message.fileInfo.length > 1 ? 's' : ''} attached</div>
                          <div className="files-list">
                            {message.fileInfo.map((file, idx) => (
                              <div key={idx} className="file-attachment">
                                <div className="file-icon">
                                  {file.type.includes('image') ? <FaImage /> : <FaFile />}
                                </div>
                                <div className="file-info">
                                  <div className="file-name">{file.name}</div>
                                  <div className="file-size">{(file.size / 1024).toFixed(2)} KB</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        // Single file (legacy support)
                        <>
                          <ReactMarkdown>{message.text}</ReactMarkdown>
                          <div className="file-attachment">
                            <div className="file-icon">
                              {message.fileInfo.type.includes('image') ? <FaImage /> : <FaFile />}
                            </div>
                            <div className="file-info">
                              <div className="file-name">{message.fileInfo.name}</div>
                              <div className="file-size">{(message.fileInfo.size / 1024).toFixed(2)} KB</div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <ReactMarkdown>{message.text}</ReactMarkdown>
                  )}
                </div>
                <div className="message-timestamp">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
          {isLoading && activeConversation === currentConversation.id && (
            <div className="message bot">
              <div className="message-bubble loading">
                <div className="dot-typing"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* File Preview Area - now shown above the input form */}
        {pendingFiles.length > 0 && (
          <div className="file-preview-area">
            <div className="file-preview-header">
              <h3>Attached Files ({pendingFiles.length})</h3>
            </div>
            <div className="file-preview-list">
              {pendingFiles.map(file => (
                <div key={file.id} className="file-preview-item">
                  <div className="file-preview-icon">
                    {file.type.includes('image') ? <FaImage /> : <FaFile />}
                  </div>
                  <div className="file-preview-info">
                    <div className="file-preview-name">{file.name}</div>
                    <div className="file-preview-size">{(file.size / 1024).toFixed(2)} KB</div>
                  </div>
                  <button 
                    className="remove-file-btn"
                    onClick={() => removeFile(file.id)}
                    aria-label="Remove file"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
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
              multiple
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
            placeholder={pendingFiles.length > 0 ? "Add a message with your files..." : "Type your message here..."}
            disabled={isLoading}
            aria-label="Message input"
          />
          <button 
            type="submit" 
            className="send-btn"
            disabled={isLoading || (!input.trim() && pendingFiles.length === 0)}
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