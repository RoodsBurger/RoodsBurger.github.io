// floating-chat.js
document.addEventListener("DOMContentLoaded", function() {
    // First load the chat HTML
    fetch('floating-chat.html')
      .then(response => response.text())
      .then(html => {
        // Create container and insert HTML
        const chatContainer = document.createElement('div');
        chatContainer.innerHTML = html;
        document.body.appendChild(chatContainer);
        
        // Now initialize the chat functionality
        initChat();
      })
      .catch(error => {
        console.error('Error loading chat component:', error);
      });
      
    function initChat() {
      // Elements
      const chatBubble = document.getElementById("chat-bubble");
      const chatPanel = document.getElementById("chat-panel");
      const closeChat = document.getElementById("close-chat");
      const miniChatForm = document.getElementById("mini-chat-form");
      const miniUserInput = document.getElementById("mini-user-input");
      const miniChatMessages = document.getElementById("mini-chat-messages");
      
      // State
      let conversationHistory = [];
      let thinkingAnimationFrame = null;
  
      // Initialize with welcome message
      function setupInitialMessage() {
        miniChatMessages.innerHTML = "";
        
        const messageWrapper = document.createElement("div");
        messageWrapper.className = "flex items-start my-4 justify-start";
        
        const bubbleContainer = document.createElement("div");
        bubbleContainer.className = "assistant-bubble py-2 pr-3 pl-8 relative max-w-[80%] flex items-start text-sm";
        
        const avatar = document.createElement("div");
        avatar.className = "absolute left-2 top-2 w-4 h-4 rounded-full bg-white flex items-center justify-center";
        avatar.innerHTML = `
          <svg class="w-2.5 h-2.5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H9.771l-.166.33A2.99 2.99 0 0110 13c.341 0 .675-.052.988-.152L11.166 12zM13 15a1 1 0 100-2 1 1 0 000 2zm-3 1a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
          </svg>
        `;
        
        const messageText = document.createElement("div");
        messageText.className = "message-text prose prose-sm w-full";
        messageText.innerHTML = "Hi! I'm Rodolfo's AI assistant. How can I help you today?";
        
        bubbleContainer.appendChild(avatar);
        bubbleContainer.appendChild(messageText);
        messageWrapper.appendChild(bubbleContainer);
        miniChatMessages.appendChild(messageWrapper);
      }
  
      // Setup the initial message
      setupInitialMessage();
  
      // Open chat when bubble is clicked
      chatBubble.addEventListener("click", function() {
        chatPanel.classList.remove("hidden");
        
        if (window.innerWidth < 768) {
          document.body.classList.add("overflow-hidden");
          chatPanel.classList.add("mobile-chat-open");
        }
        
        miniUserInput.focus();
      });
  
      // Close chat when close button is clicked
      closeChat.addEventListener("click", function() {
        chatPanel.classList.add("hidden");
        document.body.classList.remove("overflow-hidden");
        chatPanel.classList.remove("mobile-chat-open");
      });
  
      // Handle form submission
      miniChatForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        const messageText = miniUserInput.value.trim();
        if (!messageText) return;
  
        // Add user message
        appendUserMessage(messageText);
        miniUserInput.value = "";
        
        // Show thinking indicator
        const thinkingId = showThinkingIndicator();
  
        try {
          // Add to conversation history
          conversationHistory.push({
            role: "user",
            content: messageText
          });
  
          // Send to API
          const response = await fetch("/.netlify/functions/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              message: messageText,
              conversationHistory: conversationHistory.slice(0, -1) 
            }),
          });
  
          // Remove thinking indicator
          removeThinkingIndicator(thinkingId);
  
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
  
          // Parse response
          const data = await response.json();
  
          // Extract message text
          let fullResponseText = "";
          if (data && data.message && Array.isArray(data.message.content)) {
            fullResponseText = data.message.content
              .map(chunk => chunk.text)
              .join(" ");
          } else {
            fullResponseText = "I'm sorry, I couldn't generate a response at the moment.";
          }
  
          // Add assistant response to history
          conversationHistory.push({
            role: "assistant",
            content: fullResponseText
          });
  
          // Display assistant message
          appendAssistantMessage(fullResponseText);
        } catch (error) {
          removeThinkingIndicator(thinkingId);
          console.error("Error fetching chat response:", error);
          
          appendAssistantMessage("Sorry, something went wrong. Please try again later.");
        }
      });
  
      // Add user message to chat
      function appendUserMessage(text) {
        const messageWrapper = document.createElement("div");
        messageWrapper.className = "flex my-3 justify-end";
        
        const bubbleContainer = document.createElement("div");
        bubbleContainer.className = "user-bubble py-2 pl-3 pr-8 relative max-w-[80%] flex items-start text-sm";
        
        const avatar = document.createElement("div");
        avatar.className = "absolute right-2 top-2 w-4 h-4 rounded-full bg-white flex items-center justify-center";
        avatar.innerHTML = `
          <svg class="w-2.5 h-2.5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
          </svg>
        `;
        
        const messageText = document.createElement("div");
        messageText.className = "message-text prose prose-sm w-full";
        messageText.innerHTML = formatMessageText(text);
        
        bubbleContainer.appendChild(avatar);
        bubbleContainer.appendChild(messageText);
        messageWrapper.appendChild(bubbleContainer);
        miniChatMessages.appendChild(messageWrapper);
        
        miniChatMessages.scrollTop = miniChatMessages.scrollHeight;
      }
  
      // Add assistant message to chat
      function appendAssistantMessage(text) {
        const messageWrapper = document.createElement("div");
        messageWrapper.className = "flex my-3 justify-start";
        
        const bubbleContainer = document.createElement("div");
        bubbleContainer.className = "assistant-bubble py-2 pr-3 pl-8 relative max-w-[80%] flex items-start text-sm";
        
        const avatar = document.createElement("div");
        avatar.className = "absolute left-2 top-2 w-4 h-4 rounded-full bg-white flex items-center justify-center";
        avatar.innerHTML = `
          <svg class="w-2.5 h-2.5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H9.771l-.166.33A2.99 2.99 0 0110 13c.341 0 .675-.052.988-.152L11.166 12zM13 15a1 1 0 100-2 1 1 0 000 2zm-3 1a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
          </svg>
        `;
        
        const messageText = document.createElement("div");
        messageText.className = "message-text prose prose-sm w-full";
        messageText.innerHTML = formatMessageText(text);
        
        bubbleContainer.appendChild(avatar);
        bubbleContainer.appendChild(messageText);
        messageWrapper.appendChild(bubbleContainer);
        miniChatMessages.appendChild(messageWrapper);
        
        miniChatMessages.scrollTop = miniChatMessages.scrollHeight;
      }
  
      // Show thinking indicator
      function showThinkingIndicator() {
        const thinkingId = `thinking-${Date.now()}`;
        
        const messageWrapper = document.createElement("div");
        messageWrapper.className = "flex items-start my-4 thinking-indicator justify-start";
        messageWrapper.id = thinkingId;
        
        const bubbleContainer = document.createElement("div");
        bubbleContainer.className = "assistant-bubble py-2 pr-3 pl-8 relative max-w-[80%] flex items-start";
        
        const avatar = document.createElement("div");
        avatar.className = "absolute left-2 top-2 w-4 h-4 rounded-full bg-white flex items-center justify-center";
        avatar.innerHTML = `
          <svg class="w-2.5 h-2.5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H9.771l-.166.33A2.99 2.99 0 0110 13c.341 0 .675-.052.988-.152L11.166 12zM13 15a1 1 0 100-2 1 1 0 000 2zm-3 1a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
          </svg>
        `;
        
        const text = document.createElement("div");
        text.className = "thinking-dots w-full text-sm";
        text.textContent = "Thinking";
        
        bubbleContainer.appendChild(avatar);
        bubbleContainer.appendChild(text);
        messageWrapper.appendChild(bubbleContainer);
        miniChatMessages.appendChild(messageWrapper);
        
        animateThinkingDots(thinkingId);
        miniChatMessages.scrollTop = miniChatMessages.scrollHeight;
        
        return thinkingId;
      }
      
      // Animate thinking dots
      function animateThinkingDots(thinkingId) {
        const thinkingElement = document.querySelector(`#${thinkingId} .thinking-dots`);
        if (!thinkingElement) return;
        
        let dotCount = 0;
        const updateDots = () => {
          if (!thinkingElement) return;
          
          dotCount = (dotCount % 3) + 1;
          thinkingElement.textContent = `Thinking${'.'.repeat(dotCount)}`;
          
          thinkingAnimationFrame = requestAnimationFrame(() => {
            setTimeout(updateDots, 500);
          });
        };
        
        updateDots();
      }
  
      // Remove thinking indicator
      function removeThinkingIndicator(thinkingId) {
        if (thinkingAnimationFrame) {
          cancelAnimationFrame(thinkingAnimationFrame);
        }
        
        const thinkingElement = document.getElementById(thinkingId);
        if (thinkingElement) {
          thinkingElement.remove();
        }
      }
      
      // Format message text
      function formatMessageText(text) {
        return text
          .replace(/\n/g, '<br>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>');
      }
      
      // Close chat when clicking outside
      document.addEventListener("click", function(e) {
        if (!chatPanel.classList.contains("hidden")) {
          const isClickInsideChat = chatPanel.contains(e.target);
          const isClickOnChatBubble = chatBubble.contains(e.target);
          
          if (!isClickInsideChat && !isClickOnChatBubble) {
            chatPanel.classList.add("hidden");
            document.body.classList.remove("overflow-hidden");
            chatPanel.classList.remove("mobile-chat-open");
          }
        }
      });
      
      // Prevent chat from closing when clicking inside it
      chatPanel.addEventListener("click", function(e) {
        e.stopPropagation();
      });
    }
  });