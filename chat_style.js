document.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.getElementById("chat-form");
  const userInput = document.getElementById("user-input");
  const chatMessages = document.getElementById("chat-messages");
  const submitButton = document.querySelector("#chat-form button[type='submit']");
  
  // Keep track of conversation history to send to the API
  let conversationHistory = [];
  
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const messageText = userInput.value.trim();
    if (!messageText) return;
    
    // Clear the default introductory message if present
    if (chatMessages.children.length === 1 && chatMessages.children[0].querySelector(".initial-message")) {
      chatMessages.innerHTML = "";
    }
    
    // Append the user's message
    appendMessage("user", messageText);
    
    // Add to conversation history
    conversationHistory.push({
      role: "user",
      message: messageText
    });
    
    // Clear input and disable form
    userInput.value = "";
    userInput.disabled = true;
    submitButton.disabled = true;
    
    // Change button to show loading state
    const originalButtonContent = submitButton.innerHTML;
    submitButton.innerHTML = `
      <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Thinking...</span>
    `;
    
    // Create and append the thinking indicator
    const thinkingId = appendThinkingIndicator();
    
    try {
      // Send the message including conversation history
      const response = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: messageText,
          history: conversationHistory
        }),
      });
      
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      
      const data = await response.json();
      console.log("Received data:", data);
      
      // Extract response text
      let fullResponseText = "";
      if (data && data.message && Array.isArray(data.message.content)) {
        fullResponseText = data.message.content
          .map(chunk => chunk.text)
          .join(" ");
      } else {
        fullResponseText = "I'm sorry, I couldn't generate a response at the moment.";
      }
      
      // Remove thinking indicator
      removeThinkingIndicator(thinkingId);
      
      // Add to conversation history
      conversationHistory.push({
        role: "assistant",
        message: fullResponseText
      });
      
      // Display the response with a typing effect
      appendMessageWithTypingEffect("assistant", fullResponseText);
      
    } catch (error) {
      console.error("Error fetching chat response:", error);
      
      // Remove thinking indicator
      removeThinkingIndicator(thinkingId);
      
      // Show error message
      appendMessage("assistant", "Sorry, something went wrong.");
    } finally {
      // Restore button state
      submitButton.innerHTML = originalButtonContent;
      
      // Re-enable the form
      userInput.disabled = false;
      submitButton.disabled = false;
      userInput.focus();
    }
  });
  
  // Function to append message immediately
  function appendMessage(role, text) {
    const messageWrapper = document.createElement("div");
    messageWrapper.className = "message-bubble";
    
    // Add role-specific classes for styling
    if (role === "user") {
      messageWrapper.classList.add("user-message");
    } else {
      messageWrapper.classList.add("assistant-message");
    }
    
    // Create icon
    const iconDiv = createIconForRole(role);
    
    // Create text content
    const messageContent = document.createElement("div");
    messageContent.className = "flex-1";
    
    // Process text to handle markdown-like formatting
    const formattedText = formatMessageText(text);
    
    messageContent.innerHTML = `<div class="prose prose-sm">
                                  <div class="text-gray-600 message-content">${formattedText}</div>
                                </div>`;
    
    // Assemble the message - order based on role
    if (role === "user") {
      // For user messages, icon goes after content (right aligned)
      messageWrapper.appendChild(messageContent);
      messageWrapper.appendChild(iconDiv);
    } else {
      // For assistant messages, icon goes before content (left aligned)
      messageWrapper.appendChild(iconDiv);
      messageWrapper.appendChild(messageContent);
    }
    
    chatMessages.appendChild(messageWrapper);
    
    // Scroll to the bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Function for typing effect
  function appendMessageWithTypingEffect(role, text) {
    const messageWrapper = document.createElement("div");
    messageWrapper.className = "message-bubble";
    
    // Add role-specific classes
    if (role === "user") {
      messageWrapper.classList.add("user-message");
    } else {
      messageWrapper.classList.add("assistant-message");
    }
    
    // Create icon
    const iconDiv = createIconForRole(role);
    
    // Create content container
    const messageContent = document.createElement("div");
    messageContent.className = "flex-1";
    
    // Create the element that will receive the typing effect
    const textContainer = document.createElement("div");
    textContainer.className = "prose prose-sm";
    
    const textElement = document.createElement("div");
    textElement.className = "text-gray-600 message-content";
    textContainer.appendChild(textElement);
    messageContent.appendChild(textContainer);
    
    // Assemble the message - order based on role
    if (role === "user") {
      // For user messages, icon goes after content (right aligned)
      messageWrapper.appendChild(messageContent);
      messageWrapper.appendChild(iconDiv);
    } else {
      // For assistant messages, icon goes before content (left aligned)
      messageWrapper.appendChild(iconDiv);
      messageWrapper.appendChild(messageContent);
    }
    
    chatMessages.appendChild(messageWrapper);
    
    // Start the typing effect
    typeText(textElement, formatMessageText(text));
    
    // Scroll to the bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Text typing animation
  function typeText(element, text, speed = 10) {
    let i = 0;
    let formattedText = text; // Text has been pre-formatted
    
    element.innerHTML = ''; // Clear the element
    
    function typing() {
      if (i < formattedText.length) {
        // Logic for handling HTML tags
        if (formattedText.substring(i).startsWith('<')) {
          // Find the closing > to get the full tag
          const closeTagIndex = formattedText.indexOf('>', i);
          if (closeTagIndex !== -1) {
            element.innerHTML += formattedText.substring(i, closeTagIndex + 1);
            i = closeTagIndex + 1;
          } else {
            element.innerHTML += formattedText.charAt(i);
            i++;
          }
        } else {
          element.innerHTML += formattedText.charAt(i);
          i++;
        }
        
        // Scroll as we type
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        setTimeout(typing, speed);
      }
    }
    
    typing();
  }
  
  // Format message text with basic markdown
  function formatMessageText(text) {
    // Convert URLs to links
    text = text.replace(
      /(https?:\/\/[^\s]+)/g, 
      '<a href="$1" target="_blank" class="text-blue-600 hover:underline">$1</a>'
    );
    
    // Convert line breaks to <br>
    text = text.replace(/\n/g, '<br>');
    
    // Basic markdown for bold, italic, code
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>');
    
    // Add special class for project names to highlight them
    text = text.replace(/Tobias|Knolling Bot|Artificial Synaptic Pruning|Magnetic Wallet/g, 
      '<span class="text-blue-600 font-medium">$&</span>');
    
    return text;
  }
  
  // Create role-specific icon
  function createIconForRole(role) {
    const iconDiv = document.createElement("div");
    iconDiv.className = "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0";
    
    if (role === "assistant") {
      iconDiv.classList.add("bg-blue-50");
      // Simple AI/bot icon
      iconDiv.innerHTML = `<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                          </svg>`;
    } else {
      iconDiv.classList.add("bg-gray-50");
      // Simple user icon
      iconDiv.innerHTML = `<svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>`;
    }
    
    return iconDiv;
  }
  
  // Function to show "thinking" animation
  function appendThinkingIndicator() {
    const id = "thinking-" + Date.now();
    const thinkingDiv = document.createElement("div");
    thinkingDiv.id = id;
    thinkingDiv.className = "message-bubble assistant-message thinking-bubble";
    
    // Create icon
    const iconDiv = document.createElement("div");
    iconDiv.className = "w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0";
    iconDiv.innerHTML = `<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                          </svg>`;
    
    // Create thinking animation
    const thinkingContent = document.createElement("div");
    thinkingContent.className = "flex-1";
    thinkingContent.innerHTML = `<div class="prose prose-sm">
                                  <div class="text-gray-600 message-content flex items-center">
                                    <span class="mr-2">Thinking</span>
                                    <span class="typing-dot">•</span>
                                    <span class="typing-dot">•</span>
                                    <span class="typing-dot">•</span>
                                  </div>
                                </div>`;
    
    thinkingDiv.appendChild(iconDiv);
    thinkingDiv.appendChild(thinkingContent);
    chatMessages.appendChild(thinkingDiv);
    
    // Auto-scroll
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return id;
  }
  
  // Remove thinking indicator
  function removeThinkingIndicator(id) {
    const thinkingDiv = document.getElementById(id);
    if (thinkingDiv) {
      thinkingDiv.remove();
    }
  }
  
  // Add event listener for Enter key
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  });

  // Add label to the first message
  const initialMessage = document.querySelector("#chat-messages > div:first-child");
  if (initialMessage) {
    initialMessage.classList.add("initial-message");
  }
});