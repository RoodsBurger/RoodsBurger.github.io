document.addEventListener("DOMContentLoaded", () => {
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("user-input");
    const chatMessages = document.getElementById("chat-messages");
  
    chatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const messageText = userInput.value.trim();
      if (!messageText) return;
  
      // Clear the default introductory message if it's still present.
      if (chatMessages.children.length === 1) {
        chatMessages.innerHTML = "";
      }
  
      // Append the user's message.
      appendMessage("user", messageText);
      userInput.value = "";
  
      try {
        // Send the user's message to your Netlify function.
        const response = await fetch("/.netlify/functions/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: messageText }),
        });
  
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
  
        let data = await response.json();
        console.log("Received raw data:", data);
  
        // If the function returned a "body" property, parse it.
        if (data.body) {
          try {
            data = JSON.parse(data.body);
          } catch (e) {
            console.error("Error parsing data.body:", e);
          }
        }
  
        console.log("Parsed data:", data);
  
        // Extract the assistant's response text.
        let fullResponseText = "";
        if (data && data.message && Array.isArray(data.message.content)) {
          fullResponseText = data.message.content
            .map(chunk => chunk.text)
            .join(" ");
        } else if (data && data.text) {
          fullResponseText = data.text;
        } else {
          console.warn("Response structure unexpected. Using fallback text.");
          fullResponseText = "No message returned.";
        }
  
        // Append the assistant's response.
        appendMessage("assistant", fullResponseText);
      } catch (error) {
        console.error("Error fetching chat response:", error);
        appendMessage("assistant", "Sorry, something went wrong.");
      }
    });
  
    function appendMessage(role, text) {
      // Create a wrapper for the new message.
      const messageWrapper = document.createElement("div");
      messageWrapper.className = "flex items-start gap-4 my-2";
  
      // Create an icon for the message based on the role.
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
  
      // Create the container for the message text.
      const messageContent = document.createElement("div");
      messageContent.className = "flex-1";
      messageContent.innerHTML = `<div class="prose prose-sm">
                                    <p class="text-gray-600">${text}</p>
                                  </div>`;
  
      // Append the icon and text to the wrapper and then to the chat container.
      messageWrapper.appendChild(iconDiv);
      messageWrapper.appendChild(messageContent);
      chatMessages.appendChild(messageWrapper);
  
      // Auto-scroll to the bottom of the chat container.
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  });
  