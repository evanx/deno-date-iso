import { sleep } from "https://deno.land/x/sleep/mod.ts";
import { connect, Redis } from "https://deno.land/x/redis/mod.ts";
import { unflattenRedis } from "./utils.ts";

const redis = await connect({
  hostname: "127.0.0.1",
  port: 6379,
});

const serviceUrl = "https://github.com/evanx/deno-date-iso/service.ts";
const replyStreamKey = "deno-date-iso:reply:x";

if (Deno.args.length !== 1) {
  throw new Error("Missing config key");
}
const instanceKey = Deno.args[0];
if (!/:h$/.test(instanceKey)) {
  throw new Error(
    `Expecting instance key argument with ':h' postfix: ${instanceKey}`,
  );
}

type Config = {
  stream: string;
  consumer: string;
  replyExpireSeconds: number;
};

const configMap = unflattenRedis(await redis.hgetall(instanceKey));
const config = {
  stream: configMap.get("stream") as string,
  consumer: configMap.get("consumer") as string,
  xreadGroupBlockMillis: 2000,
  replyExpireSeconds: 8,
};

await redis.hset(instanceKey, ["pid", Deno.pid]);

while (true) {
  if ((await redis.hget(instanceKey, "pid")) !== String(Deno.pid)) {
    throw new Error("Aborting because 'pid' field removed/changed");
  }
  const [reply] = await redis.xreadgroup(
    [[config.stream, ">"]],
    {
      group: "service",
      consumer: config.consumer,
      block: config.xreadGroupBlockMillis,
      count: 1,
    },
  );
  if (!reply || reply.messages.length === 0) {
    continue;
  }
  if (reply.messages.length !== 1) {
    throw new Error(`Expecting 1 message: ${reply.messages.length}`);
  }
  const message = reply.messages[0];
  const { id, service } = message.fieldValues;
  let code;
  if (!id) {
    await redis.hincrby(instanceKey, "err:id", 1);
  } else if (service !== serviceUrl) {
    code = 400;
    await redis.hincrby(instanceKey, "err:service", 1);
    await redis.lpush(
      `reply:${id}`,
      JSON.stringify({ code, err: "service" }),
    );
  } else {
    code = 200;
    await redis.lpush(
      `reply:${id}`,
      JSON.stringify({ code, reply: new Date().toISOString() }),
    );
    await redis.expire(`reply:${id}`, config.replyExpireSeconds);
    await redis.xadd(replyStreamKey, "*", { id, service, code });
    console.log(`Processed: ${id}`, message);
    await sleep(1);
  }
}
