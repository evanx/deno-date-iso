import { sleep } from "https://deno.land/x/sleep/mod.ts";
import { connect, Redis } from "https://deno.land/x/redis/mod.ts";
import { unflattenRedis } from "./utils.ts";

const redis = await connect({
  hostname: "127.0.0.1",
  port: 6379,
});

if (Deno.args.length !== 1) {
  throw new Error("Missing config key");
}

const workerKey = Deno.args[0];

if (!/:h$/.test(workerKey)) {
  throw new Error(
    `Expecting worker key argument with ':h' postfix: ${workerKey}`,
  );
}

const configMap = unflattenRedis(await redis.hgetall(workerKey));

const config = {
  workerUrl: "https://github.com/evanx/deno-date-iso/worker.ts",
  requestStream: configMap.get("requestStream") as string,
  responseStream: configMap.get("responseStream") as string,
  consumerId: configMap.get("consumerId") as string,
  requestLimit: parseInt(configMap.get("requestLimit") as string || "0"),
  xreadGroupBlockMillis: 2000,
  replyExpireSeconds: 8,
};

if (await redis.hexists(workerKey, "pid") === 1) {
  throw new Error(
    `Expecting instance hashes to have empty 'pid' field: ${workerKey}`,
  );
}

await redis.hset(workerKey, ["pid", Deno.pid]);

let requestCount = 0;

while (config.requestLimit === 0 || requestCount < config.requestLimit) {
  if ((await redis.hget(workerKey, "pid")) !== String(Deno.pid)) {
    throw new Error("Aborting because 'pid' field removed/changed");
  }

  const [reply] = await redis.xreadgroup(
    [[config.requestStream, ">"]],
    {
      group: "worker",
      consumer: config.consumerId,
      block: config.xreadGroupBlockMillis,
      count: 1,
    },
  );

  if (!reply || reply.messages.length === 0) {
    continue;
  }

  requestCount++;

  if (reply.messages.length !== 1) {
    throw new Error(`Expecting 1 message: ${reply.messages.length}`);
  }

  const message = reply.messages[0];
  const { ref, workerUrl } = message.fieldValues;
  let code;
  let res;
  if (!ref) {
    await redis.hincrby(workerKey, "err:ref", 1);
    continue;
  } else if (workerUrl !== config.workerUrl) {
    await redis.hincrby(workerKey, "err:workerUrl", 1);
    code = 400;
    res = { err: "workerUrl" };
  } else {
    code = 200;
    res = { data: new Date().toISOString() };
  }
  await redis.lpush(
    `res:${ref}`,
    JSON.stringify(Object.assign({ code }, res)),
  );
  await redis.expire(`res:${ref}`, config.replyExpireSeconds);
  await redis.xadd(config.responseStream, "*", { ref, workerUrl, code });
  console.log(`Processed: ${ref}`, res);
}

Deno.exit(0);
