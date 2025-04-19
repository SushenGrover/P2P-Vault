// src/components/JoinRoom.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function JoinRoom() {
  const [inputId, setInputId] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate(); // Initialize the navigate hook
  
  const handleJoin = () => {
    if (inputId.length === 4 && /^\d+$/.test(inputId)) {
      setError("");
      // Navigate to the room with the entered ID
      navigate(`/room/${inputId}`);
      // Remove the alert since we're navigating instead
    } else {
      setError("Please enter a valid 4-digit Room ID.");
    }
  };

  return (
    <div className="join-room">
      <input
        type="text"
        maxLength="4"
        placeholder="Enter 4-digit Room ID"
        value={inputId}
        onChange={(e) => setInputId(e.target.value)}
      />
      <button onClick={handleJoin}>Enter Room</button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
