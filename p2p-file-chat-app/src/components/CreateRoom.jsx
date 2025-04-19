// src/components/CreateRoom.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CreateRoom() {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate(); // Initialize the navigate hook
  
  const generateRoomId = () => {
    // Generates a 4-digit random number as a string, with leading zeros if needed
    const id = `${Math.floor(Math.random() * 10000)}`.padStart(4, "0");
    setRoomId(id);
    // Here, you can also call your backend to create the room if needed
  };
  
  const enterRoom = () => {
    // Navigate to the room with the generated ID
    navigate(`/room/${roomId}`);
  };
  
  return (
    <div className="create-room">
      <button onClick={generateRoomId}>Create ID</button>
      {roomId && (
        <div>
          <p>Your Room ID: <strong>{roomId}</strong></p>
          <p>Share this ID with your friend to join the room.</p>
          <button onClick={enterRoom}>Enter Room</button>
        </div>
      )}
    </div>
  );
}
