// src/components/Chat.jsx
import React, { useState } from "react";
export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (input.trim()) {
      setMessages([...messages, { text: input }]);
      setInput("");
    }
  };

  return (
    <div className="chat-box">
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i}>{msg.text}</div>
        ))}
      </div>
      <div className="chat-input-row">

      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Type a message"
        />
      <button onClick={sendMessage}>Send</button>
        </div>
    </div>
  );
}
