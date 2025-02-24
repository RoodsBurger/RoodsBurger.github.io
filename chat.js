document.addEventListener("DOMContentLoaded", () => {
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("user-input");
    const chatMessages = document.getElementById("chat-messages");
  
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const messageText = userInput.value.trim();
      if (!messageText) return;
  
      // Clear default message if present (assuming only one child exists initially)
      if (chatMessages.children.length === 1) {
        chatMessages.innerHTML = "";
      }
  
      // Append the user's message to the chat container
      appendMessage("user", messageText);
  
      // Clear the input field
      userInput.value = "";
  
      try {
        // Send the user's message to your Netlify function at /.netlify/functions/chat
        const response = await fetch("/.netlify/functions/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: messageText }),
        });
  
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
  
        const data = await response.json();
  
        // Assuming your backend returns a JSON response in the format:
        // {
        //   "message": {
        //     "content": [
        //       { "type": "text", "text": "Part one..." },
        //       { "type": "text", "text": "Part two..." }
        //     ]
        //   }
        // }
        const fullResponseText = data.message.content
          .map((chunk) => chunk.text)
          .join(" ");
  
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
  
      // Create the icon based on the role
      const iconDiv = document.createElement("div");
      iconDiv.className = "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0";
      if (role === "assistant") {
        iconDiv.classList.add("bg-blue-100");
        iconDiv.innerHTML = `<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4"></path>
                              </svg>`;
      } else {
        iconDiv.classList.add("bg-green-100");
        iconDiv.innerHTML = `<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                              </svg>`;
      }
  
      // Create the container for the message text
      const messageContent = document.createElement("div");
      messageContent.className = "flex-1";
      messageContent.innerHTML = `<div class="prose prose-sm">
                                    <p class="text-gray-600">${text}</p>
                                  </div>`;
  
      // Append the icon and text to the message wrapper, then append to the chat container
      messageWrapper.appendChild(iconDiv);
      messageWrapper.appendChild(messageContent);
      chatMessages.appendChild(messageWrapper);
  
      // Auto-scroll to the bottom of the chat container
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  });
  