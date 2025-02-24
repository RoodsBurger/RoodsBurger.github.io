document.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.getElementById("chat-form");
  const userInput = document.getElementById("user-input");
  const chatMessages = document.getElementById("chat-messages");
  
  // Store conversation history
  let conversationHistory = [];

  // Replace the initial message with a simpler bubble message
  function setupInitialMessage() {
    chatMessages.innerHTML = ""; // Clear any existing content
    
    // Create and append the initial message
    appendMessage(
      "assistant", 
      "Hi! I'm Rodolfo's AI assistant. I can help you learn about his work in robotics, machine learning, projects, and interests. What would you like to know?",
      true // Auto-display without typing animation for initial message
    );
  }

  // Run setup
  setupInitialMessage();

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const messageText = userInput.value.trim();
    if (!messageText) return;

    // Append the user's message to the chat container
    appendMessage("user", messageText, true);
    userInput.value = "";

    // Show thinking indicator
    const thinkingId = showThinkingIndicator();

    try {
      // Add user message to conversation history
      conversationHistory.push({
        role: "user",
        content: messageText
      });

      // Send the message and conversation history to your Netlify function
      const response = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: messageText,
          conversationHistory: conversationHistory.slice(0, -1) // Send all except current message which is already included separately
        }),
      });

      // Remove thinking indicator once response is received
      removeThinkingIndicator(thinkingId);

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      console.log("Received data:", data);

      // Extract the full assistant response from the returned message content.
      let fullResponseText = "";
      if (data && data.message && Array.isArray(data.message.content)) {
        fullResponseText = data.message.content
          .map(chunk => chunk.text)
          .join(" ");
      } else {
        fullResponseText = "I'm sorry, I couldn't generate a response at the moment.";
      }

      // Add assistant response to conversation history
      conversationHistory.push({
        role: "assistant",
        content: fullResponseText
      });

      // Append the assistant's response to the chat container with typing animation
      appendMessage("assistant", fullResponseText);
    } catch (error) {
      // Remove thinking indicator if there's an error
      removeThinkingIndicator(thinkingId);
      
      console.error("Error fetching chat response:", error);
      appendMessage("assistant", "Sorry, something went wrong.", true);
    }
  });

  // Generate a unique ID for the thinking indicator
  function showThinkingIndicator() {
    const thinkingId = `thinking-${Date.now()}`;
    
    // Create message wrapper
    const messageWrapper = document.createElement("div");
    messageWrapper.className = "flex items-start my-4 thinking-indicator justify-start";
    messageWrapper.id = thinkingId;

    // Create the integrated bubble with avatar
    const bubbleContainer = document.createElement("div");
    bubbleContainer.className = "assistant-bubble py-3 pr-4 pl-10 relative max-w-[80%] flex items-start";
    
    // Create avatar
    const avatar = document.createElement("div");
    avatar.className = "absolute left-2 top-3 w-6 h-6 rounded-full bg-white flex items-center justify-center";
    avatar.innerHTML = `
      <svg class="w-3.5 h-3.5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H9.771l-.166.33A2.99 2.99 0 0110 13c.341 0 .675-.052.988-.152L11.166 12zM13 15a1 1 0 100-2 1 1 0 000 2zm-3 1a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
      </svg>
    `;
    
    // Create the text with thinking dots animation
    const text = document.createElement("div");
    text.className = "thinking-dots w-full";
    text.textContent = "Thinking";
    
    // Assemble the message
    bubbleContainer.appendChild(avatar);
    bubbleContainer.appendChild(text);
    messageWrapper.appendChild(bubbleContainer);
    
    // Add to chat container
    chatMessages.appendChild(messageWrapper);
    
    // Start the animation for the thinking dots
    animateThinkingDots(thinkingId);
    
    // Auto-scroll to the bottom of the chat container
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return thinkingId;
  }
  
  let thinkingAnimationFrame = null;
  
  // Animate the thinking dots
  function animateThinkingDots(thinkingId) {
    const thinkingElement = document.querySelector(`#${thinkingId} .thinking-dots`);
    if (!thinkingElement) return;
    
    let dotCount = 0;
    const updateDots = () => {
      if (!thinkingElement) return;
      
      dotCount = (dotCount % 3) + 1;
      thinkingElement.textContent = `Thinking${'.'.repeat(dotCount)}`;
      
      thinkingAnimationFrame = requestAnimationFrame(() => {
        // Slowing down the animation with setTimeout
        setTimeout(updateDots, 500);
      });
    };
    
    updateDots();
  }

  // Remove the thinking indicator
  function removeThinkingIndicator(thinkingId) {
    if (thinkingAnimationFrame) {
      cancelAnimationFrame(thinkingAnimationFrame);
    }
    
    const thinkingElement = document.getElementById(thinkingId);
    if (thinkingElement) {
      thinkingElement.remove();
    }
  }

  function appendMessage(role, text, immediate = false) {
    // Create the message wrapper element with appropriate alignment
    const messageWrapper = document.createElement("div");
    messageWrapper.className = "flex my-4";
    
    if (role === "user") {
      messageWrapper.className += " justify-end"; // Right-align user messages
    } else {
      messageWrapper.className += " justify-start"; // Left-align assistant messages
    }

    // Create the integrated bubble with avatar
    const bubbleContainer = document.createElement("div");
    bubbleContainer.className = role === "user" 
      ? "user-bubble py-3 pl-4 pr-10 relative max-w-[80%] flex items-start" 
      : "assistant-bubble py-3 pr-4 pl-10 relative max-w-[80%] flex items-start";

    // Create avatar that will be positioned inside the bubble
    const avatar = document.createElement("div");
    
    if (role === "user") {
      avatar.className = "absolute right-2 top-3 w-6 h-6 rounded-full bg-white flex items-center justify-center";
      avatar.innerHTML = `
        <svg class="w-3.5 h-3.5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
        </svg>
      `;
    } else {
      avatar.className = "absolute left-2 top-3 w-6 h-6 rounded-full bg-white flex items-center justify-center";
      avatar.innerHTML = `
        <svg class="w-3.5 h-3.5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H9.771l-.166.33A2.99 2.99 0 0110 13c.341 0 .675-.052.988-.152L11.166 12zM13 15a1 1 0 100-2 1 1 0 000 2zm-3 1a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
      `;
    }
    
    // Create the text element
    const messageText = document.createElement("div");
    messageText.className = "message-text prose prose-sm w-full";
    
    // Format the text with markdown-like formatting
    const formattedText = formatMessageText(text);
    
    // Add avatar to bubble
    bubbleContainer.appendChild(avatar);
    
    if (immediate) {
      // Display full message immediately
      messageText.innerHTML = formattedText;
      bubbleContainer.appendChild(messageText);
      messageWrapper.appendChild(bubbleContainer);
      chatMessages.appendChild(messageWrapper);
    } else {
      // Start with empty text and type it out
      messageText.innerHTML = '';
      bubbleContainer.appendChild(messageText);
      messageWrapper.appendChild(bubbleContainer);
      chatMessages.appendChild(messageWrapper);
      
      // Type out the message
      typeMessage(formattedText, messageText);
    }
    
    // Auto-scroll to the bottom of the chat container
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Function to simulate typing with more random variations
  function typeMessage(text, element, baseSpeed = 30) {
    // Calculate an approximate total animation time - about 30ms per character
    const totalCharCount = text.replace(/<[^>]*>/g, '').length;
    const targetTotalTime = totalCharCount * 30; // target milliseconds for the whole text
    
    // Convert HTML to array of characters and HTML tags
    const htmlChunks = [];
    let inTag = false;
    let currentChunk = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (char === '<' && !inTag) {
        if (currentChunk) {
          htmlChunks.push({ type: 'text', content: currentChunk });
          currentChunk = '';
        }
        inTag = true;
        currentChunk = '<';
      } else if (char === '>' && inTag) {
        currentChunk += '>';
        htmlChunks.push({ type: 'tag', content: currentChunk });
        currentChunk = '';
        inTag = false;
      } else {
        currentChunk += char;
      }
    }
    
    if (currentChunk) {
      htmlChunks.push({ type: inTag ? 'tag' : 'text', content: currentChunk });
    }
    
    // Type out each chunk with more varied speeds
    let i = 0;
    let outputSoFar = '';
    let animationStartTime = Date.now();
    
    function typeNextChunk() {
      if (i < htmlChunks.length) {
        const chunk = htmlChunks[i];
        
        if (chunk.type === 'tag') {
          // Add HTML tags instantly
          outputSoFar += chunk.content;
          element.innerHTML = outputSoFar;
          i++;
          typeNextChunk();
        } else {
          // Type text character by character with highly variable speed
          let charIndex = 0;
          
          function typeNextChar() {
            if (charIndex < chunk.content.length) {
              // Add next character to output
              outputSoFar += chunk.content[charIndex];
              element.innerHTML = outputSoFar;
              charIndex++;
              
              // Create more dramatic speed variations
              let speed = baseSpeed;
              const char = chunk.content[charIndex - 1];
              
              // Occasional pauses for "thinking"
              const randomPause = Math.random() < 0.05; // 5% chance of a pause
              
              if (randomPause) {
                // Add a random pause between 300-800ms
                speed = baseSpeed + Math.floor(Math.random() * 500) + 300;
              }
              // Even longer pause at paragraph breaks
              else if (char === '.' && charIndex < chunk.content.length && chunk.content[charIndex] === '\n') {
                speed = baseSpeed * 5;
              }
              // Longer pause at end of sentences
              else if ('.!?'.includes(char)) {
                speed = baseSpeed * (2 + Math.random() * 2); // 2-4x pause at sentence end
              }
              // Medium pause at commas and other punctuation
              else if (',;:'.includes(char)) {
                speed = baseSpeed * (1.5 + Math.random());
              }
              // Slight speed up for common words
              else if (charIndex > 2 && ' the a and to of in is '.includes(' ' + chunk.content.slice(Math.max(0, charIndex - 4), charIndex) + ' ')) {
                speed = baseSpeed * 0.6;
              }
              // Random burst of fast typing
              else if (Math.random() < 0.1) { // 10% chance of a speed burst
                speed = baseSpeed * 0.3;
              }
              // Regular random variation for natural feel
              else {
                speed = baseSpeed * (0.7 + Math.random() * 0.8); // 0.7x to 1.5x normal speed
              }
              
              // Adjust timing to keep overall animation time consistent
              const elapsed = Date.now() - animationStartTime;
              const progress = elapsed / targetTotalTime;
              const charsRemaining = totalCharCount - outputSoFar.replace(/<[^>]*>/g, '').length;
              
              if (progress > 0.8 && charsRemaining > totalCharCount * 0.3) {
                // If we're running behind schedule (80% time used but >30% chars remaining)
                speed *= 0.7; // Speed up to catch up
              } else if (progress < 0.5 && charsRemaining < totalCharCount * 0.3) {
                // If we're ahead of schedule (less than 50% time used but <30% chars remaining)
                speed *= 1.3; // Slow down a bit
              }
              
              setTimeout(typeNextChar, speed);
            } else {
              i++;
              typeNextChunk();
            }
          }
          typeNextChar();
        }
      }
      
      // Auto-scroll while typing
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    typeNextChunk();
  }
  
  function formatMessageText(text) {
    // Simple formatting to handle line breaks and basic markdown
    return text
      // Convert line breaks to HTML breaks
      .replace(/\n/g, '<br>')
      // Bold text between asterisks
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic text between single asterisks
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }
});