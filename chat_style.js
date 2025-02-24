document.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.getElementById("chat-form");
  const userInput = document.getElementById("user-input");
  const chatMessages = document.getElementById("chat-messages");

  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const messageText = userInput.value.trim();
    if (!messageText) return;

    // Clear the default introductory message if present (assumes it's the only child initially)
    if (chatMessages.children.length === 1) {
      chatMessages.innerHTML = "";
    }

    // Append the user's message
    appendMessage("user", messageText);
    userInput.value = "";

    // Append a placeholder for the assistant's message and show the typing indicator.
    const aiMessageElement = appendMessage("assistant", "");
    showTypingIndicator(aiMessageElement);

    try {
      // Send the message to your Netlify function
      const response = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
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

      // Remove the typing indicator and display the answer using a typewriter effect.
      removeTypingIndicator(aiMessageElement);
      await typeAnswer(aiMessageElement, fullResponseText);
    } catch (error) {
      console.error("Error fetching chat response:", error);
      removeTypingIndicator(aiMessageElement);
      aiMessageElement.textContent = "Sorry, something went wrong.";
    }
  });

  // Appends a message to the chat container.
  // For assistant messages, returns the <p> element so we can update its content.
  function appendMessage(role, text) {
    // Create the message wrapper element.
    const messageWrapper = document.createElement("div");
    messageWrapper.className = "flex items-start gap-4 my-2";

    // Create an icon element based on the role.
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

    // Append the icon and text container, then add to chatMessages.
    messageWrapper.appendChild(iconDiv);
    messageWrapper.appendChild(messageContent);
    chatMessages.appendChild(messageWrapper);

    // Auto-scroll to the bottom.
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // For assistant messages, return the <p> element so we can update it.
    if (role === "assistant") {
      return messageContent.querySelector("p");
    }
  }

  // Shows a typing indicator by animating dots.
  function showTypingIndicator(element) {
    let dotCount = 0;
    element.textContent = "Thinking";
    element.typingInterval = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      element.textContent = "Thinking" + ".".repeat(dotCount);
    }, 500);
  }

  // Removes the typing indicator animation.
  function removeTypingIndicator(element) {
    if (element.typingInterval) {
      clearInterval(element.typingInterval);
      delete element.typingInterval;
    }
  }

  // Simulates a typewriter effect to reveal the answer character by character.
  function typeAnswer(element, answer) {
    return new Promise(resolve => {
      element.textContent = "";
      let index = 0;
      const interval = setInterval(() => {
        if (index < answer.length) {
          element.textContent += answer.charAt(index);
          index++;
          // Keep chat scrolled to the bottom as text appears.
          chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
          clearInterval(interval);
          resolve();
        }
      }, 30);
    });
  }
});
