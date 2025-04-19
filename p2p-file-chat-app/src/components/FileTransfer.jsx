// src/components/FileTransfer.jsx
import React, { useState } from 'react';
import { encryptFile } from '../utils/encryption';

export default function FileTransfer({ peerConnection }) {
  const [file, setFile] = useState(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptionProgress, setEncryptionProgress] = useState(0);
  const [isSending, setIsSending] = useState(false);
  
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };
  
  const sendFile = async () => {
    if (!file || !peerConnection) return;
    
    try {
      setIsEncrypting(true);
      setEncryptionProgress(10);
      
      // Encrypt the file
      const encrypted = await encryptFile(file);
      setEncryptionProgress(50);
      
      // Prepare metadata to send first
      const metadata = {
        type: 'file-metadata',
        fileName: encrypted.fileName,
        fileType: encrypted.fileType,
        fileSize: encrypted.fileSize,
        iv: Array.from(encrypted.iv), // Convert to regular array for JSON
        key: Array.from(new Uint8Array(encrypted.key)), // Convert key for JSON
      };
      
      // Send metadata first
      peerConnection.send(JSON.stringify(metadata));
      setEncryptionProgress(70);
      
      // Convert encrypted data to an array buffer for sending
      const encryptedBuffer = encrypted.encryptedData;
      
      // Send the actual file data
      setIsSending(true);
      peerConnection.send(encryptedBuffer);
      setEncryptionProgress(100);
      
      // Reset states
      setTimeout(() => {
        setIsEncrypting(false);
        setIsSending(false);
        setEncryptionProgress(0);
        setFile(null);
        // Reset file input
        document.getElementById('file-input').value = '';
      }, 1000);
      
    } catch (error) {
      console.error('Error sending file:', error);
      setIsEncrypting(false);
      setIsSending(false);
    }
  };
  
  return (
    <div className="file-transfer">
      <input 
        type="file" 
        id="file-input"
        onChange={handleFileChange} 
        disabled={isEncrypting || isSending}
      />
      <button 
        onClick={sendFile} 
        disabled={!file || isEncrypting || isSending || !peerConnection}
      >
        {isEncrypting ? `Encrypting (${encryptionProgress}%)` : 
         isSending ? 'Sending...' : 'Send File'}
      </button>
      {file && !isEncrypting && !isSending && (
        <p className="file-info">Selected: {file.name} ({Math.round(file.size / 1024)} KB)</p>
      )}
    </div>
  );
}
