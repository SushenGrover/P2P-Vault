import io from "socket.io-client";
import Peer from "simple-peer";
const CHUNK_SIZE = 16384;
// Connect to your backend socket server
const socket = io("http://localhost:5000");

// For debugging
socket.on("connect", () => {
  console.log("Connected to signaling server with ID:", socket.id);
});

export default function usePeerConnection(roomId) {
  let peer = null;
  let connectionEstablished = false;

  // Callbacks to be defined by components using this utility
  const callbacks = {
    onConnect: null,
    onMessage: null,
    onFile: null,
    onError: null,
  };

  // Initialize connection when joining a room
  const joinRoom = () => {
    console.log("Joining room:", roomId);
    socket.emit("join-room", roomId);

    // Clean up any existing listeners to prevent duplicates
    socket.off("room-status");
    socket.off("user-joined");
    socket.off("signal");

    // Listen for room status updates
    socket.on("room-status", ({ peers }) => {
      console.log(`Room has ${peers} other peers`);
    });

    // Use a flag to track if we're already processing a join
    let processingJoin = false;

    // When another user joins the room
    socket.on("user-joined", (userId) => {
      console.log("User joined, creating offer:", userId);

      // Prevent multiple simultaneous connection attempts
      if (processingJoin) {
        console.log("Already processing a join, ignoring duplicate");
        return;
      }

      processingJoin = true;
      createPeer(userId, true); // Create as initiator
      setTimeout(() => {
        processingJoin = false;
      }, 5000); // Reset after 5 seconds in case something goes wrong
    });

    // Handle incoming signals (offers, answers, ice candidates)
    // Add this to your peer.js
    let retryCount = 0;
    const MAX_RETRIES = 3;

    // Modify signal handler to include retries
    socket.on("signal", ({ from, signal }) => {
      try {
        if (!peer) {
          createPeer(from, false);
        }

        peer.signal(signal);
        retryCount = 0; // Reset on success
      } catch (err) {
        console.error("Error processing signal:", err);

        if (retryCount < MAX_RETRIES) {
          retryCount++;
          console.log(`Retrying signal (${retryCount}/${MAX_RETRIES})...`);

          // Wait and recreate peer
          setTimeout(() => {
            if (peer) {
              try {
                peer.destroy();
              } catch (e) {}
            }
            peer = null;
            createPeer(from, false);

            // Retry the signal
            setTimeout(() => {
              peer.signal(signal);
            }, 300);
          }, 500);
        }
      }
    });
  };

  // Create a peer connection
  const createPeer = (userId, isInitiator) => {
    console.log(`Creating peer connection (initiator: ${isInitiator})`);

    // Check if we already have a peer - destroy it if so
    // Add this before destroying the peer
    if (peer) {
      console.log("Checking before destroying peer...");
      // Don't destroy if in the middle of file transfer
      if (peer._channel && peer._channel.bufferedAmount > 0) {
        console.log("Postponing peer destruction - transfer in progress");
        return null; // Return existing peer
      }
      console.log("Destroying existing peer before creating new one");
      peer.destroy();
      peer = null;
    }

    try {
      // Create new peer with proper ICE servers
      // In peer.js createPeer function
      peer = new Peer({
        initiator: isInitiator,
        trickle: false,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            {
              urls: "turn:numb.viagenie.ca",
              username: "webrtc@live.com",
              credential: "muazkh",
            },
          ],
        },
      });
      // Add inside createPeer function
      peer.on("connect", () => {
        console.log("Peer connection established!");
        connectionEstablished = true;

        // Monitor data channel state
        if (peer._channel) {
          peer._channel.onclose = () => {
            console.log("Data channel closed");
            connectionEstablished = false;
          };

          peer._channel.onerror = (err) => {
            console.error("Data channel error:", err);
          };
        }

        if (callbacks.onConnect) callbacks.onConnect();
      });

      // When we have signal data to send
      peer.on("signal", (data) => {
        console.log("Generated signal data, sending to peer");
        socket.emit("signal", {
          roomId,
          to: userId,
          signal: data,
        });
      });

      // When connection is established
      peer.on("connect", () => {
        console.log("Peer connection established!");
        connectionEstablished = true;
        if (callbacks.onConnect) callbacks.onConnect();
      });

      // When we receive data
      // In peer.js or wherever you set up your WebRTC connection:

      // Fix your peer.js data event handler
      // Inside peer.js data event handler
      peer.on("data", (data) => {
        console.log(
          "Raw data received:",
          typeof data,
          data instanceof Uint8Array
            ? "Uint8Array"
            : data instanceof ArrayBuffer
            ? "ArrayBuffer"
            : "other",
          data instanceof Uint8Array
            ? data.length
            : data instanceof ArrayBuffer
            ? data.byteLength
            : data
        );

        // For strings (text data)
        if (typeof data === "string") {
          try {
            const parsedData = JSON.parse(data);
            console.log("Parsed JSON data:", parsedData);

            if (parsedData.type === "message") {
              if (callbacks.onMessage) {
                callbacks.onMessage(parsedData.content);
              }
            } else if (parsedData.type === "file-metadata") {
              console.log("🔴 FILE METADATA RECEIVED", parsedData);
              if (callbacks.onFileMetadata) {
                callbacks.onFileMetadata(parsedData);
              }
            } else if (parsedData.type === "protocol") {
              console.log("Protocol message:", parsedData.action);
              // Handle protocol messages if needed
            }
          } catch (err) {
            console.error("Error parsing JSON data:", err);
          }
        }
        // For binary data
        else if (data instanceof Uint8Array || data instanceof ArrayBuffer) {
          if (callbacks.onFileData) {
            callbacks.onFileData(data);
          }
        }
      });

      // Handle errors
      peer.on("error", (err) => {
        console.error("Peer connection error:", err);
        if (callbacks.onError) callbacks.onError(err);
      });

      return peer;
    } catch (err) {
      console.error("Error creating peer:", err);
      if (callbacks.onError) callbacks.onError(err);
      return null;
    }
  };

  // Send a chat message
  const sendMessage = (message) => {
    if (!peer || !connectionEstablished) {
      console.error("Cannot send message: Peer connection not established");
      return false;
    }

    console.log("Sending message:", message);
    peer.send(
      JSON.stringify({
        type: "message",
        content: message,
      })
    );
    return true;
  };

  const sendFile = async (file) => {
    if (!peer || !connectionEstablished) {
      console.error("Cannot send file: Peer connection not established");
      return false;
    }

    try {
      // Check if data channel is open before each send operation
      const checkChannelOpen = () => {
        if (!peer || !peer._channel || peer._channel.readyState !== "open") {
          throw new Error("Data channel not open");
        }
      };

      // Send protocol start message
      checkChannelOpen();
      peer.send(
        JSON.stringify({
          type: "protocol",
          action: "file-start",
        })
      );

      // Send metadata with longer delay
      checkChannelOpen();
      const metadata = {
        type: "file-metadata",
        name: file.name,
        size: file.size,
        mimeType: file.type,
      };
      console.log("Sending file metadata:", metadata);
      peer.send(JSON.stringify(metadata));

      // Longer delay - critical for stability
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Read file
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);

      // For small files (< 16KB), send in one chunk to avoid multiple state checks
      if (data.length < CHUNK_SIZE) {
        checkChannelOpen();
        console.log(`Sending small file in single chunk, size: ${data.length}`);
        peer.send(data);
      } else {
        // For larger files, send in chunks with state check before each
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
          checkChannelOpen();
          const chunk = data.slice(i, i + CHUNK_SIZE);
          console.log(
            `Sending chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(
              data.length / CHUNK_SIZE
            )}, size: ${chunk.length}`
          );
          peer.send(chunk);

          // Delay between chunks
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      // Send end protocol message
      checkChannelOpen();
      peer.send(
        JSON.stringify({
          type: "protocol",
          action: "file-end",
        })
      );

      return true;
    } catch (error) {
      console.error("Error sending file:", error);
      return false;
    }
  };

  // Set callbacks
  const setCallbacks = (newCallbacks) => {
    Object.assign(callbacks, newCallbacks);
  };

  return {
    joinRoom,
    sendMessage,
    sendFile,
    setCallbacks,
    isConnected: () => connectionEstablished,
  };
}
