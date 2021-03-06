import { Aes } from "https://deno.land/x/crypto/aes.ts";
import { Cbc, Padding } from "https://deno.land/x/crypto/block-modes.ts";
import { decode as decodeHex } from "https://deno.land/std/encoding/hex.ts";
import { decode as decodeBase64 } from "https://deno.land/std/encoding/base64.ts";
//import { sleep } from "https://deno.land/x/sleep/mod.ts";
//import { Redis } from "https://deno.land/x/redis/mod.ts";

export function unflattenRedis(array: string[]): Map<String, String> {
  const map = new Map();
  for (let index = 0; index < array.length; index += 2) {
    map.set(array[index], array[index + 1]);
  }
  return map;
}

export async function readStream(
  stream: Deno.Reader,
  limit: number,
): Promise<string> {
  const buffer = new Uint8Array(limit);
  const length = <number> await stream.read(buffer);
  return new TextDecoder().decode(buffer.subarray(0, length))
    .trim();
}

export async function decryptStream(
  ivHex: string, // openssl takes hex args for AES iv and password
  encryptedBase64: string, // openssl can produce base64 output
  inputStream = Deno.stdin,
) {
  const te = new TextEncoder();
  const td = new TextDecoder();
  const [type, input] = (await readStream(inputStream, 256)).split(" ");
  if (type !== "is1") {
    throw new Error(`Invalid input type: ${type}`);
  }
  const secret = decodeHex(te.encode(input));
  const iv = decodeHex(te.encode(ivHex));
  const decipher = new Cbc(Aes, secret, iv, Padding.PKCS7);
  const decrypted = decipher.decrypt(decodeBase64(encryptedBase64));
  return td.decode(decrypted);
}
