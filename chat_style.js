document.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.getElementById("chat-form");
  const userInput = document.getElementById("user-input");
  const chatMessages = document.getElementById("chat-messages");
  
  // Store conversation history
  let conversationHistory = [];

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const messageText = userInput.value.trim();
    if (!messageText) return;

    // Clear the default introductory message if present (assumes it's the only child initially)
    if (chatMessages.children.length === 1) {
      chatMessages.innerHTML = "";
    }

    // Append the user's message to the chat container
    appendMessage("user", messageText);
    userInput.value = "";

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

      // Append the assistant's response to the chat container
      appendMessage("assistant", fullResponseText);
    } catch (error) {
      console.error("Error fetching chat response:", error);
      appendMessage("assistant", "Sorry, something went wrong.");
    }
  });

  function appendMessage(role, text) {
    // Create the message wrapper element
    const messageWrapper = document.createElement("div");
    messageWrapper.className = "flex items-start gap-4 my-2";

    // Create an icon element based on the role
    const iconDiv = document.createElement("div");
    iconDiv.className = "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0";
    if (role === "assistant") {
      iconDiv.classList.add("bg-blue-100");
      iconDiv.innerHTML = `<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="M9 12l2 2 4-4"></path>
                            </svg>`;
    } else {
      iconDiv.classList.add("bg-green-100");
      iconDiv.innerHTML = `<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                    d="M5 13l4 4L19 7"></path>
                            </svg>`;
    }

    // Create the container for the message text  
    const messageContent = document.createElement("div");
    messageContent.className = "flex-1";
    
    // Process markdown-like formatting for better readability
    const formattedText = formatMessageText(text);
    
    messageContent.innerHTML = `<div class="prose prose-sm">
                                    <p class="text-gray-600">${formattedText}</p>
                                  </div>`;

    // Append the icon and text to the wrapper, then to the chat container
    messageWrapper.appendChild(iconDiv);
    messageWrapper.appendChild(messageContent);
    chatMessages.appendChild(messageWrapper);

    // Auto-scroll to the bottom of the chat container
    chatMessages.scrollTop = chatMessages.scrollHeight;
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