import { Redis } from "https://deno.land/x/redis/mod.ts";

export function unflattenRedis(array: string[]): Map<String, String> {
  const map = new Map();
  for (let index = 0; index < array.length; index += 2) {
    map.set(array[index], array[index + 1]);
  }
  return map;
}
