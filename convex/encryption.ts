"use node";

import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

// The algorithm needs to be compatible with the key size
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended IV length

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable not set. Please set a 32-byte (64 character) hex key."
    );
  }
  if (key.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be 32 bytes (64 characters) in hex format."
    );
  }
  return Buffer.from(key, "hex");
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encryptedText] = encryptedData.split(":");
  
  if (!ivHex || !authTagHex || !encryptedText) {
    throw new Error("Invalid encrypted data format");
  }
  
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
} 