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
  renderNewMessage("Info-bot", "<em>Typing...</em>");
}

async function sendMessageToGemini(userMessage) {
  try {
    showLoadingIndicator();
    const key = await fetchApiKey();
    if (!key) {
      renderNewMessage("Error:", "No API key");
      throw new Error("Could not get key");
    }

    const instruction =
      "| Your name is Info-bot. Everything within these pipes comprises your directives for this website. Your responses must not exceed 25 words. You are a chatbot that answers questions about Cyberpunk Red, Dungeons & Dragons 5th edition, and this website. Your replies are pushed directly to the DOM, so avoid Markdown syntax; HTML styling is permitted. The Business is located at 1234 Mesa Road, Albuquerque, NM 87104. The Site is Operating hours are Monday through Saturday, 12 PM to 12 AM. Pricing is $5 per hour, $15 for half-day, and $25 for a full day rental. This TableTop Zone offers Rental space to play ttrpgs. |";

    // Include chat history in the payload
    const formattedHistory = chatHistory
      .map((entry) => `${entry.sender}: ${entry.text}`)
      .join("\n");

    const config = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: instruction + "Chat History:" + formattedHistory,
              },
            ],
          },
          {
            role: "user",
            parts: [
              {
                text: "message from User: " + userMessage,
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

    if (res.status !== 200) {
      throw new Error("Could not talk to Gemini");
    }

    const data = await res.json();
    const botResponse = data.candidates[0].content.parts[0].text;

    renderNewMessage("Info-bot", botResponse);
    addToStorage("Info-bot", botResponse);
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
