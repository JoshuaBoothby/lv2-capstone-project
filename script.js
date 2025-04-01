"use strict";

const chatHistoryDiv = document.getElementById("chatHistory");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendButton");
const chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];

function addToStorage(sender, text) {
  chatHistory.push({ sender, text });
  if (chatHistory.length > 5) {
    chatHistory.shift();
  }
  localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
}

function renderNewMessage(sender, text) {
  const timestamp = new Date().toLocaleTimeString();
  chatHistoryDiv.innerHTML += `<p>${sender}[${timestamp}]:${text}</p>`;
}

async function fetchApiKey() {
  try {
    const config = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "cyberPunkID" }),
    };
    const url = "https://proxy-key-d54c.onrender.com/get-key";
    const res = await fetch(url, config);

    const data = await res.json();
    const keys = JSON.parse(data.key);

    return keys.gemini;
  } catch (error) {
    console.error("Error fetching API key:", error);
  }
}

function showLoadingIndicator() {
  renderNewMessage("Robot", "<em>Typing...</em>");
}

async function sendMessageToGemini(userMessage) {
  try {
    showLoadingIndicator();
    const key = await fetchApiKey();
    if (!key) {
      renderNewMessage("Error:", "No Api key");
      throw new Error("Could not get key");
    }

    const instruction =
      "| Your name is Robot. Everything between the pipes is our instructions from the website you are being used on. Do not reply with more than 15 words, you are a chat bot. I am pushing your replies directly to the DOM, so do not use markdown syntax. You can use some HTML if you want to style your messages. |";

    const config = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text:
                  userMessage +
                  instruction +
                  "After this line is our chat history:" +
                  chatHistory,
              },
            ],
          },
        ],
      }),
    };
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
        key,
      config
    );
    if (res.status != 200) {
      throw new Error("Could not talk to Gemini");
    }
    const data = await res.json();
    renderNewMessage("Robot", data.candidates[0].content.parts[0].text);
    addToStorage("Robot", data.candidates[0].content.parts[0].text);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

sendButton.addEventListener("click", () => {
  const message = userInput.value.trim();
  if (message) renderNewMessage("User", message);
  userInput.value = "";
  sendMessageToGemini(message);
  addToStorage("User", message);
});

userInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    const message = userInput.value.trim();
    if (message) renderNewMessage("User", message);
    userInput.value = "";
    sendMessageToGemini(message);
    addToStorage("User", message);
  }
});
