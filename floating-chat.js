document.addEventListener("DOMContentLoaded", function() {
  // Load the floating chat HTML and then initialize chat functionality
  fetch('/floating-chat.html')
    .then(response => response.text())
    .then(html => {
      const chatContainer = document.createElement('div');
      chatContainer.innerHTML = html;
      document.body.appendChild(chatContainer);
      initChat();
    })
    .catch(error => {
      console.error('Error loading chat component:', error);
    });

  function initChat() {
    const chatBubble = document.getElementById("chat-bubble");
    const chatPanel = document.getElementById("chat-panel");
    const chatBubbleContainer = document.getElementById("chat-bubble-container");
    const closeChat = document.getElementById("close-chat");
    const miniChatForm = document.getElementById("mini-chat-form");
    const miniUserInput = document.getElementById("mini-user-input");
    const miniChatMessages = document.getElementById("mini-chat-messages");
    const chatInputArea = document.querySelector("#chat-panel .chat-input-area");

    let conversationHistory = [];

    // ====== Setup the initial assistant welcome message ======
    function setupInitialMessage() {
      miniChatMessages.innerHTML = "";
      const messageWrapper = document.createElement("div");
      messageWrapper.className = "flex items-start my-4 justify-start";

      const bubbleContainer = document.createElement("div");
      bubbleContainer.className = "assistant-bubble py-2 pr-3 pl-3 max-w-[80%] flex items-baseline text-sm";

      const avatar = document.createElement("div");
      avatar.className = "w-4 h-4 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center mr-2";
      avatar.innerHTML = `
        <svg class="w-2.5 h-2.5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd"
                d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H9.771l-.166.33A2.99 2.99 0 0110 13c.341 0 .675-.052.988-.152L11.166 12zM13 15a1 1 0 100-2 1 1 0 000 2zm-3 1a1 1 0 100-2 1 1 0 000 2z"
                clip-rule="evenodd" />
        </svg>`;

      const messageText = document.createElement("div");
      messageText.className = "message-text prose prose-sm w-full";
      messageText.innerHTML = "Hi! I'm Rodolfo's AI assistant. How can I help you today?";

      bubbleContainer.appendChild(avatar);
      bubbleContainer.appendChild(messageText);
      messageWrapper.appendChild(bubbleContainer);
      miniChatMessages.appendChild(messageWrapper);
    }
    setupInitialMessage();

    // ====== Open chat panel when chat bubble is clicked ======
    chatBubble.addEventListener("click", function() {
      chatPanel.classList.remove("hidden");
      if (window.innerWidth < 768) {
        chatPanel.classList.add("mobile-chat-open");
        // Remove any "overflow-hidden" usage on body
        chatBubbleContainer.classList.add("hide");
      }
      miniUserInput.focus();
    });

    // ====== Close chat panel when close button is clicked ======
    closeChat.addEventListener("click", function() {
      chatPanel.classList.add("hidden");
      chatPanel.classList.remove("mobile-chat-open");
      chatBubbleContainer.classList.remove("hide");
    });

    // ====== Adjust on window resize to remove mobile classes on desktop ======
    window.addEventListener("resize", function() {
      if (window.innerWidth >= 768) {
        chatPanel.classList.remove("mobile-chat-open");
        chatBubbleContainer.classList.remove("hide");
      }
    });

    // ====== Use visualViewport to position input above keyboard on mobile ======
    if (window.visualViewport) {
      const repositionInput = () => {
        // Only do this if chat is open on mobile
        if (!chatPanel.classList.contains("mobile-chat-open")) return;

        // Calculate how much space is taken by the keyboard
        const bottomOffset = window.innerHeight -
          (window.visualViewport.height + window.visualViewport.offsetTop);

        // Shift input area up by that offset
        chatInputArea.style.marginBottom = bottomOffset > 0
          ? `${bottomOffset}px`
          : "0";
      };

      window.visualViewport.addEventListener("resize", repositionInput);
      window.visualViewport.addEventListener("scroll", repositionInput);
    }

    // ====== Handle message submission ======
    miniChatForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      const messageText = miniUserInput.value.trim();
      if (!messageText) return;

      appendUserMessage(messageText);
      miniUserInput.value = "";
      const thinkingId = showThinkingIndicator();

      try {
        conversationHistory.push({ role: "user", content: messageText });
        const response = await fetch("/.netlify/functions/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            message: messageText,
            conversationHistory: conversationHistory.slice(0, -1) 
          }),
        });
        removeThinkingIndicator(thinkingId);

        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();

        let fullResponseText = "";
        if (data && data.message && Array.isArray(data.message.content)) {
          fullResponseText = data.message.content.map(chunk => chunk.text).join(" ");
        } else {
          fullResponseText = "I'm sorry, I couldn't generate a response at the moment.";
        }

        conversationHistory.push({ role: "assistant", content: fullResponseText });
        appendAssistantMessage(fullResponseText);

      } catch (error) {
        removeThinkingIndicator(thinkingId);
        console.error("Error fetching chat response:", error);
        appendAssistantMessage("Sorry, something went wrong. Please try again later.");
      }
    });

    // ====== Append a user message (icon on the right) ======
    function appendUserMessage(text) {
      const messageWrapper = document.createElement("div");
      messageWrapper.className = "flex my-3 justify-end";

      const bubbleContainer = document.createElement("div");
      bubbleContainer.className = "user-bubble py-2 pl-3 pr-3 max-w-[80%] flex items-baseline text-sm justify-end";

      const messageTextEl = document.createElement("div");
      messageTextEl.className = "message-text prose prose-sm w-full text-right";
      messageTextEl.innerHTML = formatMessageText(text);

      const avatar = document.createElement("div");
      avatar.className = "w-4 h-4 rounded-full bg-white flex-shrink-0 flex items-center justify-center ml-2";
      avatar.innerHTML = `
        <svg class="w-2.5 h-2.5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clip-rule="evenodd" />
        </svg>`;

      bubbleContainer.appendChild(messageTextEl);
      bubbleContainer.appendChild(avatar);
      messageWrapper.appendChild(bubbleContainer);
      miniChatMessages.appendChild(messageWrapper);
      miniChatMessages.scrollTop = miniChatMessages.scrollHeight;
    }

    // ====== Append an assistant message (icon on the left) with typewriter effect ======
    function appendAssistantMessage(text) {
      const messageWrapper = document.createElement("div");
      messageWrapper.className = "flex my-3 justify-start";

      const bubbleContainer = document.createElement("div");
      bubbleContainer.className = "assistant-bubble py-2 pr-3 pl-3 max-w-[80%] flex items-baseline text-sm";

      const avatar = document.createElement("div");
      avatar.className = "w-4 h-4 rounded-full bg-white flex-shrink-0 flex items-center justify-center mr-2";
      avatar.innerHTML = `
        <svg class="w-2.5 h-2.5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd"
                d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H9.771l-.166.33A2.99 2.99 0 0110 13c.341 0 .675-.052.988-.152L11.166 12zM13 15a1 1 0 100-2 1 1 0 000 2zm-3 1a1 1 0 100-2 1 1 0 000 2z"
                clip-rule="evenodd" />
        </svg>`;

      const messageTextEl = document.createElement("div");
      messageTextEl.className = "message-text prose prose-sm w-full";

      bubbleContainer.appendChild(avatar);
      bubbleContainer.appendChild(messageTextEl);
      messageWrapper.appendChild(bubbleContainer);
      miniChatMessages.appendChild(messageWrapper);
      miniChatMessages.scrollTop = miniChatMessages.scrollHeight;

      // Typewriter effect
      typeWriterEffect(messageTextEl, text, 0);
    }

    // ====== Typewriter effect ======
    function typeWriterEffect(element, text, index) {
      if (index < text.length) {
        element.innerHTML += text.charAt(index);
        setTimeout(() => {
          typeWriterEffect(element, text, index + 1);
        }, 30);
      }
    }

    // ====== Show a thinking indicator ======
    function showThinkingIndicator() {
      const thinkingId = `thinking-${Date.now()}`;
      const messageWrapper = document.createElement("div");
      messageWrapper.className = "flex items-start my-4 thinking-indicator justify-start";
      messageWrapper.id = thinkingId;

      const bubbleContainer = document.createElement("div");
      bubbleContainer.className = "assistant-bubble py-2 pr-3 pl-3 max-w-[80%] flex items-baseline";

      const avatar = document.createElement("div");
      avatar.className = "w-4 h-4 rounded-full bg-white flex-shrink-0 flex items-center justify-center mr-2";
      avatar.innerHTML = `
        <svg class="w-2.5 h-2.5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd"
                d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H9.771l-.166.33A2.99 2.99 0 0110 13c.341 0 .675-.052.988-.152L11.166 12zM13 15a1 1 0 100-2 1 1 0 000 2zm-3 1a1 1 0 100-2 1 1 0 000 2z"
                clip-rule="evenodd" />
        </svg>`;

      const textEl = document.createElement("span");
      textEl.className = "thinking-dots text-sm";
      textEl.textContent = "Thinking";

      bubbleContainer.appendChild(avatar);
      bubbleContainer.appendChild(textEl);
      messageWrapper.appendChild(bubbleContainer);
      miniChatMessages.appendChild(messageWrapper);
      miniChatMessages.scrollTop = miniChatMessages.scrollHeight;

      return thinkingId;
    }

    // ====== Remove the thinking indicator by its ID ======
    function removeThinkingIndicator(thinkingId) {
      const thinkingElement = document.getElementById(thinkingId);
      if (thinkingElement) {
        thinkingElement.remove();
      }
    }

    // ====== Format message text with basic markdown-like replacements ======
    function formatMessageText(text) {
      return text
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    // ====== Close chat panel if clicking outside it ======
    document.addEventListener("click", function(e) {
      if (!chatPanel.classList.contains("hidden")) {
        const isClickInsideChat = chatPanel.contains(e.target);
        const isClickOnChatBubble = chatBubble.contains(e.target);
        if (!isClickInsideChat && !isClickOnChatBubble) {
          chatPanel.classList.add("hidden");
          chatPanel.classList.remove("mobile-chat-open");
          chatBubbleContainer.classList.remove("hide");
        }
      }
    });

    // ====== Prevent closing the chat panel when clicking inside it ======
    chatPanel.addEventListener("click", function(e) {
      e.stopPropagation();
    });
  }
});
