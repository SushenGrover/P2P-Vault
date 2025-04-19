import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import usePeerConnection from "../utils/peer";
import Chat from "./Chat";
import FileTransfer from "./FileTransfer";
import { decryptFile } from "../utils/encryption";

export default function Room() {
  const CHUNK_SIZE = 16384; // 16KB chunks for WebRTC
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [inputMessage, setInputMessage] = useState("");
  const [fileMetadata, setFileMetadata] = useState(null);
  const [isReceivingFile, setIsReceivingFile] = useState(false);
  const peerConnection = useRef(usePeerConnection(roomId));

  const handleReceivedData = async (data) => {
    // Handle string data (should be JSON)
    if (typeof data === "string") {
      try {
        const parsedData = JSON.parse(data);
        console.log("Received JSON data:", parsedData);

        // When you successfully decode message JSON:
        if (parsedData.type === "message") {
          console.log("Message received, updating UI:", parsedData.content);
          // Force UI update with setTimeout to ensure it runs after current execution
          setTimeout(() => {
            setMessages((prevMessages) => {
              const newMessages = [
                ...prevMessages,
                {
                  text: parsedData.content,
                  sender: "peer",
                },
              ];
              console.log("Updated messages state:", newMessages);
              return newMessages;
            });
          }, 0);
        } else if (parsedData.type === "file-metadata") {
          console.log("Setting up file reception with metadata:", parsedData);
          setFileMetadata(parsedData);
          window.fileChunks = new Uint8Array(parsedData.size);
          window.chunksReceived = 0;
          setIsReceivingFile(true);
        }
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    }
    // Handle binary data (file chunks)
    else if (
      (data instanceof Uint8Array || data instanceof ArrayBuffer) &&
      isReceivingFile &&
      fileMetadata
    ) {
      console.log(
        "Processing file chunk, received so far:",
        window.chunksReceived * CHUNK_SIZE,
        "of",
        fileMetadata.size
      );

      const chunk = data instanceof Uint8Array ? data : new Uint8Array(data);
      const offset = window.chunksReceived * CHUNK_SIZE;

      try {
        window.fileChunks.set(chunk, offset);
        window.chunksReceived++;

        // Check if file is complete
        if (offset + chunk.length >= fileMetadata.size) {
          console.log("File transfer complete, creating download");

          const file = new File(
            [window.fileChunks.slice(0, fileMetadata.size)],
            fileMetadata.name,
            { type: fileMetadata.mimeType || "application/octet-stream" }
          );

          const url = URL.createObjectURL(file);
          const link = document.createElement("a");
          link.href = url;
          link.download = fileMetadata.name;
          document.body.appendChild(link);
          link.click();

          setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(link);
          }, 100);

          setMessages((prev) => [
            ...prev,
            {
              text: `Received file: ${fileMetadata.name}`,
              sender: "peer",
              isFile: true,
            },
          ]);

          setIsReceivingFile(false);
          setFileMetadata(null);
          delete window.fileChunks;
          delete window.chunksReceived;
        }
      } catch (error) {
        console.error("Error processing chunk:", error);
      }
    }
    // If we get binary data but we're not in file receiving mode
    else if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
      console.log(
        "Received binary data but not in file receiving mode - this may be metadata"
      );

      // Try to decode as string in case it's actually JSON data
      try {
        const decoder = new TextDecoder();
        const textData = decoder.decode(data);

        try {
          const jsonData = JSON.parse(textData);
          console.log("Successfully decoded binary to JSON:", jsonData);

          if (jsonData.type === "file-metadata") {
            setFileMetadata(jsonData);
            window.fileChunks = new Uint8Array(jsonData.size);
            window.chunksReceived = 0;
            setIsReceivingFile(true);
          } else if (jsonData.type === "message") {
            console.log(
              "Message received from binary, updating UI:",
              jsonData.content
            );
            setTimeout(() => {
              setMessages((prevMessages) => {
                const newMessages = [
                  ...prevMessages,
                  {
                    text: jsonData.content,
                    sender: "peer",
                  },
                ];
                console.log("Updated messages state:", newMessages);
                return newMessages;
              });
            }, 0);
          }
        } catch (e) {
          // Not valid JSON after decoding
          console.log("Binary data could not be parsed as JSON after decoding");
        }
      } catch (e) {
        console.log("Could not decode binary data as text");
      }
    }
  };

  useEffect(() => {
    const peer = peerConnection.current;

    peer.setCallbacks({
      onConnect: () => {
        console.log("Connected to peer!");
        setConnected(true);
      },
      onMessage: (message) => {
        console.log("Message received:", message);
        setMessages((prev) => [...prev, { text: message, sender: "peer" }]);
      },
      // Use handleReceivedData for both metadata and file data
      onFileMetadata: handleReceivedData,
      onFileData: handleReceivedData,
      onError: (error) => {
        console.error("Peer connection error:", error);
      },
    });

    peer.joinRoom();
  }, [roomId, isReceivingFile, fileMetadata]); // Add dependencies

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const success = peerConnection.current.sendMessage(inputMessage);
    if (success) {
      setMessages((prev) => [...prev, { text: inputMessage, sender: "me" }]);
      setInputMessage("");
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleSendFile = () => {
    if (!selectedFile) return;

    const success = peerConnection.current.sendFile(selectedFile);
    if (success) {
      setMessages((prev) => [
        ...prev,
        {
          text: `Sent file: ${selectedFile.name}`,
          sender: "me",
          isFile: true,
        },
      ]);
      setSelectedFile(null);
      // Reset file input
      document.getElementById("file-input").value = "";
    }
  };

  return (
    <div className="room-container">
      <h2 className="room-title">Room: {roomId}</h2>

      {!connected ? (
        <p className="waiting-message">Waiting for peer to join...</p>
      ) : (
        <p className="connected-message">Connected to peer</p>
      )}

      <div className="file-transfer">
        <input type="file" id="file-input" onChange={handleFileChange} />
        <button
          onClick={handleSendFile}
          disabled={!connected || !selectedFile}
          className="send-file-btn"
        >
          Send File
        </button>
      </div>

      <div className="chat-box">
        <div className="messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${
                msg.sender === "me" ? "sent" : "received"
              } ${msg.isFile ? "file-message" : ""}`}
            >
              {msg.text}
            </div>
          ))}
        </div>

        <form onSubmit={handleSendMessage} className="chat-input-row">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type a message"
            disabled={!connected}
          />
          <button type="submit" disabled={!connected}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
