const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// Initialize Express app
const app = express();
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with CORS settings
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5174", // Updated to match your client port
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Room joining
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);

    // Get count of users in room
    const roomClients = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    console.log(`Total users in room ${roomId}: ${roomClients}`);

    // Broadcast to others in the room - IMPORTANT: This event name must match client
    socket.to(roomId).emit("user-joined", socket.id);

    // Notify the current user about the room status
    io.to(socket.id).emit("room-status", {
      roomId,
      peers: roomClients - 1, // Exclude self
    });
  });

  // Handle signaling - ensure format matches client expectations
// Handle signaling - ensure format matches client expectations
socket.on('signal', ({ roomId, to, signal }) => {
    console.log(`Signal from ${socket.id} to ${to} (type: ${signal.type || 'unknown'})`);
    
    // Check if the recipient is still connected
    const recipientSocket = io.sockets.sockets.get(to);
    if (!recipientSocket) {
      console.log(`Recipient ${to} is no longer connected`);
      return;
    }
    
    io.to(to).emit('signal', {
      from: socket.id,
      signal
    });
  });
  

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Define port
const PORT = process.env.PORT || 5000;

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
