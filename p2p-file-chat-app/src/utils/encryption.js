// src/utils/encryption.js
const generateEncryptionKey = () => {
    // Generate a random 256-bit (32-byte) key for AES-GCM
    return crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256
      },
      true,
      ["encrypt", "decrypt"]
    );
  };
  
  export const encryptFile = async (file) => {
    try {
      // Generate random IV (Initialization Vector)
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Generate encryption key
      const key = await generateEncryptionKey();
      
      // Export key to share with peer
      const exportedKey = await crypto.subtle.exportKey("raw", key);
      
      // Read file as ArrayBuffer
      const fileArrayBuffer = await file.arrayBuffer();
      
      // Encrypt the file content
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv
        },
        key,
        fileArrayBuffer
      );
      
      return {
        encryptedData,
        iv,
        key: exportedKey,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      };
    } catch (error) {
      console.error("Encryption error:", error);
      throw error;
    }
  };
  
  export const decryptFile = async (encryptedData, iv, keyData, fileName, fileType) => {
    try {
      // Import the encryption key
      const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        {
          name: "AES-GCM",
          length: 256
        },
        false,
        ["decrypt"]
      );
      
      // Decrypt the file data
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: new Uint8Array(iv)
        },
        key,
        encryptedData
      );
      
      // Create a File object from the decrypted data
      return new File([decryptedData], fileName, { type: fileType });
    } catch (error) {
      console.error("Decryption error:", error);
      throw error;
    }
  };
  