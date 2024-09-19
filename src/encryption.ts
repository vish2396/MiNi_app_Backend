import * as crypto from "crypto";

// Function to encrypt data
export function encrypt(text: string, password: string): string {
  const iv = crypto.randomBytes(16); // Generate a random initialization vector
  const key = crypto.createHash("sha256").update(password).digest(); // Derive a suitable key from the password
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

// Function to decrypt data
export function decrypt(text: string, password: string): string {
  const parts: string[] = text.split(":");
  const iv = Buffer.from(parts.shift() as string, "hex");
  const encryptedText = Buffer.from(parts.join(":"), "hex");
  const key = crypto.createHash("sha256").update(password).digest();
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
}
