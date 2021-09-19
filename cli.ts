import * as log from "https://deno.land/std@0.106.0/log/mod.ts";
import * as Colors from "https://deno.land/std/fmt/colors.ts";
import { ArrayReply, connect } from "https://deno.land/x/redis/mod.ts";
import { unflattenRedis } from "./utils.ts";

const redis = await connect({
  hostname: "127.0.0.1",
  port: 6379,
});

const serviceUrl = "https://github.com/evanx/deno-date-iso/service.ts";
const configKey = "deno-date-iso:config:h";
const instanceKey = "deno-date-iso:{}:h";
const streamKey = "deno-date-iso:req:x";

console.log(`${Colors.blue("stream")} ${streamKey}`);

if (Deno.args.length === 1) {
  const command = Deno.args[0];
  if (command === "del") {
    await redis.executor.exec(
      "del",
      streamKey,
    );
  } else if (command === "create") {
    await redis.executor.exec(
      "xgroup",
      "create",
      streamKey,
      "service",
      "0",
      "mkstream",
    );
  } else if (command === "config") {
    console.error(`Provide arg: <consumer>`);
    console.log(`${Colors.cyan("streamKey")} ${streamKey}`);
    console.log(`${Colors.cyan("configKey")} ${configKey}`);
    console.log(`${Colors.cyan("instanceKey")} ${instanceKey}`);
  } else if (command === "xtrim") {
    console.error(`Provide arg: <maxlen>`);
  } else if (command === "xadd") {
    console.error(`Provide arg: <id>`);
  } else if (command === "xrange") {
    const xrangeReply = await redis.xrange(
      streamKey,
      "-",
      "+",
      99,
    );
    console.log(xrangeReply);
  } else if (command === "set-instance") {
    console.error(`Provide arg: <id>`);
  } else if (command === "get-instance") {
    console.error(`Provide arg: <id>`);
  } else {
    console.error("Usage: <command>");
    console.error(
      "Commands: create config del get-instance set-instance xadd xrange",
    );
    if (command === "help") {
      Deno.exit(0);
    } else {
      console.error(`Unsupported command without args: ${command}`);
    }
  }
  Deno.exit(1);
} else if (Deno.args.length === 2) {
  const command = Deno.args[0];
  const arg = Deno.args[1];
  if (command === "set-instance") {
    const key = instanceKey.replace(/\{\}/, arg);
    await redis.hmset(key, ["service", serviceUrl], ["version", "1"], [
      "stream",
      streamKey,
    ], [
      "consumer",
      arg,
    ]);
    console.log(`${Colors.green(key)}`);
  } else if (command === "get-instance") {
    const key = instanceKey.replace(/\{\}/, arg);
    console.log(
      `${Colors.green(key)}`,
      unflattenRedis(await redis.hgetall(key)),
    );
  } else if (command === "xtrim") {
    const elements = parseInt(arg);
    const reply = await redis.xtrim(streamKey, {
      elements,
    });
    console.log(reply);
  } else if (command === "xadd") {
    const id = arg;
    const reply = await redis.xadd(streamKey, "*", { id, service: serviceUrl });
    console.log(reply);
  } else {
    console.error(`Unsupported command with 1 arg: ${command}`);
    Deno.exit(1);
  }
  Deno.exit(0);
}

try {
  const xinfoReply = (await redis.executor.exec(
    "xinfo",
    "groups",
    streamKey,
  )) as ArrayReply;
  if (!xinfoReply.value().length) {
    console.error(`Stream has no consumer groups yet`);
  } else if (xinfoReply.value().length > 1) {
    console.error(`Stream has multiple consumer groups`);
  } else {
    const xinfoMap = unflattenRedis(xinfoReply.value()[0] as string[]);
    console.log(
      Array.from(xinfoMap.entries()).map(([key, value]) =>
        `${Colors.cyan(String(key))} ${value}`
      )
        .join("\n"),
    );
  }
  Deno.exit(0);
} catch (err) {
  if (/no such key/.test(err.message)) {
    console.error(`Stream does not exist: ${streamKey}`);
  } else {
    console.error(err);
  }
  Deno.exit(1);
}
