// src/components/Home.jsx
import React, { useState } from "react";
import CreateRoom from "./CreateRoom";
import JoinRoom from "./JoinRoom";
import "../styles/main.css"; // Import your styles

export default function Home() {
  const [activeTab, setActiveTab] = useState("create");

  return (
    <div className="home-container">
      <div className="tab-header">
        <button
          className={activeTab === "create" ? "active" : ""}
          onClick={() => setActiveTab("create")}
        >
          Create Room
        </button>
        <button
          className={activeTab === "join" ? "active" : ""}
          onClick={() => setActiveTab("join")}
        >
          Join Room
        </button>
      </div>
      <div className="tab-content">
        {activeTab === "create" ? <CreateRoom /> : <JoinRoom />}
      </div>
    </div>
  );
}
