document.addEventListener('DOMContentLoaded', function() {
  const chatForm = document.getElementById('chat-form');
  const userInput = document.getElementById('user-input');
  const chatMessages = document.getElementById('chat-messages');

  chatForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const message = userInput.value.trim();
    if (message === '') return;
    
    // Append the user's message.
    addMessage('user', message);
    userInput.value = '';

    // Append a placeholder for the AI’s answer with a typing indicator.
    const aiMessageElement = addMessage('ai', '');
    showTypingIndicator(aiMessageElement);

    try {
      // Replace this with your actual fetch call to your backend.
      const answer = await getAnswer(message);
      removeTypingIndicator(aiMessageElement);
      await typeAnswer(aiMessageElement, answer);
    } catch (err) {
      removeTypingIndicator(aiMessageElement);
      aiMessageElement.textContent = 'Error: Unable to retrieve answer.';
    }
    scrollToBottom();
  });

  // Appends a message to the chat. Returns the <p> element for later updates.
  function addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('flex', 'items-start', 'gap-4', 'mb-4');

    if (sender === 'user') {
      messageDiv.innerHTML = `
        <div class="flex-1 bg-blue-100 p-4 rounded-lg self-end max-w-xs ml-auto">
          <p class="text-gray-800">${text}</p>
        </div>`;
    } else {
      messageDiv.innerHTML = `
        <div class="flex items-start gap-4">
          <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <!-- AI icon -->
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M16 12H8m8 0l-4 4m4-4l-4-4" />
            </svg>
          </div>
          <div class="flex-1 bg-gray-100 p-4 rounded-lg max-w-xs">
            <p class="text-gray-700">${text}</p>
          </div>
        </div>`;
    }
    chatMessages.appendChild(messageDiv);
    return messageDiv.querySelector('p'); // Return the text element for later manipulation.
  }

  // Displays a typing indicator (animated dots) in the given element.
  function showTypingIndicator(element) {
    let dotCount = 0;
    element.textContent = 'AI is thinking';
    element.typingInterval = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      element.textContent = 'AI is thinking' + '.'.repeat(dotCount);
    }, 500);
  }

  // Stops the typing indicator animation.
  function removeTypingIndicator(element) {
    clearInterval(element.typingInterval);
  }

  // Simulates a typewriter effect to display the answer one character at a time.
  function typeAnswer(element, answer) {
    return new Promise(resolve => {
      element.textContent = ''; // Clear any existing text.
      let index = 0;
      const interval = setInterval(() => {
        if (index < answer.length) {
          element.textContent += answer.charAt(index);
          index++;
          scrollToBottom();
        } else {
          clearInterval(interval);
          resolve();
        }
      }, 30); // Adjust the speed (in milliseconds) as desired.
    });
  }

  // Smoothly scrolls the chat area to the bottom.
  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Simulates fetching the AI answer from your backend.
  // Replace this with your actual API call.
  async function getAnswer(message) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve("This is a simulated answer from the AI. It appears as if someone is typing it in real time.");
      }, 2000); // Simulate a 2-second delay.
    });
  }
});
