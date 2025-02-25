document.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.getElementById("chat-form");
  const userInput = document.getElementById("user-input");
  const chatMessages = document.getElementById("chat-messages");
  
  let conversationHistory = [];

  function setupInitialMessage() {
    chatMessages.innerHTML = "";
    
    appendMessage(
      "assistant", 
      "Hi! I'm Rodolfo's AI assistant. I can help you learn about his work in robotics, machine learning, projects, and interests. What would you like to know?",
      true 
    );
  }

  setupInitialMessage();
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const messageText = userInput.value.trim();
    if (!messageText) return;

    appendMessage("user", messageText, true);
    userInput.value = "";
    const thinkingId = showThinkingIndicator();

    try {
      conversationHistory.push({
        role: "user",
        content: messageText
      });

      const response = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: messageText,
          conversationHistory: conversationHistory.slice(0, -1) 
        }),
      });

      removeThinkingIndicator(thinkingId);

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      console.log("Received data:", data);

      let fullResponseText = "";
      if (data && data.message && Array.isArray(data.message.content)) {
        fullResponseText = data.message.content
          .map(chunk => chunk.text)
          .join(" ");
      } else {
        fullResponseText = "I'm sorry, I couldn't generate a response at the moment.";
      }

      conversationHistory.push({
        role: "assistant",
        content: fullResponseText
      });

      appendMessage("assistant", fullResponseText);
    } catch (error) {
      removeThinkingIndicator(thinkingId);
      
      console.error("Error fetching chat response:", error);
      appendMessage("assistant", "Sorry, something went wrong.", true);
    }
  });

  function showThinkingIndicator() {
    const thinkingId = `thinking-${Date.now()}`;
    
    const messageWrapper = document.createElement("div");
    messageWrapper.className = "flex items-start my-4 thinking-indicator justify-start";
    messageWrapper.id = thinkingId;
    const bubbleContainer = document.createElement("div");
    bubbleContainer.className = "assistant-bubble py-3 pr-4 pl-10 relative max-w-[80%] flex items-start";
    const avatar = document.createElement("div");
    avatar.className = "absolute left-2 top-3 w-6 h-6 rounded-full bg-white flex items-center justify-center";
    avatar.innerHTML = `
      <svg class="w-3.5 h-3.5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H9.771l-.166.33A2.99 2.99 0 0110 13c.341 0 .675-.052.988-.152L11.166 12zM13 15a1 1 0 100-2 1 1 0 000 2zm-3 1a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
      </svg>
    `;
    
    const text = document.createElement("div");
    text.className = "thinking-dots w-full";
    text.textContent = "Thinking";
    
    bubbleContainer.appendChild(avatar);
    bubbleContainer.appendChild(text);
    messageWrapper.appendChild(bubbleContainer);
    chatMessages.appendChild(messageWrapper);
    animateThinkingDots(thinkingId);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return thinkingId;
  }
  
  let thinkingAnimationFrame = null;
  
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
    const messageWrapper = document.createElement("div");
    messageWrapper.className = "flex my-4";
    
    if (role === "user") {
      messageWrapper.className += " justify-end";
    } else {
      messageWrapper.className += " justify-start"; 
    }

    const bubbleContainer = document.createElement("div");
    bubbleContainer.className = role === "user" 
      ? "user-bubble py-3 pl-4 pr-10 relative max-w-[80%] flex items-start" 
      : "assistant-bubble py-3 pr-4 pl-10 relative max-w-[80%] flex items-start";

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
    
    const messageText = document.createElement("div");
    messageText.className = "message-text prose prose-sm w-full";
    const formattedText = formatMessageText(text);
    bubbleContainer.appendChild(avatar);
    
    if (immediate) {
      messageText.innerHTML = formattedText;
      bubbleContainer.appendChild(messageText);
      messageWrapper.appendChild(bubbleContainer);
      chatMessages.appendChild(messageWrapper);
    } else {
      messageText.innerHTML = '';
      bubbleContainer.appendChild(messageText);
      messageWrapper.appendChild(bubbleContainer);
      chatMessages.appendChild(messageWrapper);
      typeMessage(formattedText, messageText);
    }
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  function typeMessage(text, element, baseSpeed = 50) {
    const totalCharCount = text.replace(/<[^>]*>/g, '').length;
    const targetTotalTime = totalCharCount * 30; 
    
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
    
    let i = 0;
    let outputSoFar = '';
    let animationStartTime = Date.now();
    
    function typeNextChunk() {
      if (i < htmlChunks.length) {
        const chunk = htmlChunks[i];
        
        if (chunk.type === 'tag') {
          outputSoFar += chunk.content;
          element.innerHTML = outputSoFar;
          i++;
          typeNextChunk();
        } else {
          let charIndex = 0;
          let inWord = false;
          
          function typeNextChar() {
            if (charIndex < chunk.content.length) {
              const char = chunk.content[charIndex];
              outputSoFar += char;
              element.innerHTML = outputSoFar;
              charIndex++;
              
              if (char === ' ' || char === '\n' || '.!?,;:()[]{}"\'-'.includes(char)) {
                inWord = false;
              } else {
                inWord = true;
              }
              
              let speed = baseSpeed;
              const canPause = !inWord;
              const randomPause = Math.random() < 0.03 && canPause;
              
              if (randomPause) {
                speed = baseSpeed + Math.floor(Math.random() * 300) + 200;
              }
              else if ('.!?'.includes(char)) {
                speed = baseSpeed * (1.5 + Math.random()); 
              }
              else if (',;:'.includes(char)) {
                speed = baseSpeed * (1.2 + Math.random() * 0.5);
              }
              else if (charIndex > 2 && !inWord && ' the a and to of in is '.includes(' ' + chunk.content.slice(Math.max(0, charIndex - 5), charIndex))) {
                speed = baseSpeed * 0.8;
              }
              else if (Math.random() < 0.05 && !inWord) { // 5% chance of a speed burst at word boundaries
                speed = baseSpeed * 0.5;
              }
              else {
                speed = baseSpeed * (0.8 + Math.random() * 0.5); // 0.8x to 1.3x normal speed
              }
              
              const elapsed = Date.now() - animationStartTime;
              const progress = elapsed / targetTotalTime;
              const charsRemaining = totalCharCount - outputSoFar.replace(/<[^>]*>/g, '').length;
              
              if (progress > 0.7 && charsRemaining > totalCharCount * 0.4) {
                speed *= 0.7; 
              } else if (progress < 0.4 && charsRemaining < totalCharCount * 0.3) {
                speed *= 1.2; 
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
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    typeNextChunk();
  }
  
  function formatMessageText(text) {
    return text
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }
});