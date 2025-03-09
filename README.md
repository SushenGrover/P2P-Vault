# P2P Vault: Secure File Transfer & Chat System
=====================================================

## Overview
P2P Vault is a peer-to-peer (P2P) application designed for **secure file transfer** and **real-time chat** between users. The system ensures **end-to-end encryption**, providing data privacy and security. It uses WebRTC for direct P2P communication, eliminating the need for centralized data storage.

This project is ideal for users who want to share files or communicate securely without relying on third-party servers to store their data.

## Features
- **Room-Based Architecture**: Users can create or join rooms to establish isolated sessions.
- **Real-Time Chat**: Communicate with peers instantly using WebRTC DataChannels.
- **Secure File Sharing**: Transfer files in an encrypted format (AES-256).
- **End-to-End Encryption**: Ensures data privacy during communication and file transfer.
- **Self-Destructing Rooms**: Rooms are deleted after the session ends, leaving no trace of data.

## User Flow
1. A user visits the homepage and chooses to either:
   - Create a new room (generates a unique room ID).
   - Join an existing room using a shared room ID.
2. Once connected, users establish a P2P connection.
3. Users can:
   - Chat in real-time.
   - Transfer files securely (encrypted).
4. The session ends when users leave the room, and all data is destroyed.

## Technologies Used
### Frontend
- **HTML5, CSS3, JavaScript**
- **WebRTC** (DataChannel for P2P communication)
- **Socket.IO** (for signaling)

### Backend
- **Python** (Flask)
- **Flask-SocketIO** (WebSocket-based signaling server)
- **Cryptography Library** (AES-256 encryption)

### Database
- In-memory storage for active rooms (optional Redis or SQLite for persistence)

### Other Tools
- **STUN/TURN Servers** (for NAT traversal)
- **Docker** (for containerization)
- **Nginx** (for reverse proxy and HTTPS)

## How It Works
1. A signaling server built with Flask-SocketIO helps peers exchange connection metadata (e.g., ICE candidates) to establish a direct P2P connection using WebRTC.
2. Files are split into chunks, encrypted using AES-256, and transferred securely over WebRTC DataChannels.
3. Messages sent between peers are encrypted and signed using DSA to ensure integrity and authenticity.

## Setup Instructions
### Prerequisites
1. **Python 3.x** installed
2. **Node.js** installed
3. **Docker** (optional for deployment)
