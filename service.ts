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

const instanceKey = Deno.args[0];

if (!/:h$/.test(instanceKey)) {
  throw new Error(
    `Expecting instance key argument with ':h' postfix: ${instanceKey}`,
  );
}

const configMap = unflattenRedis(await redis.hgetall(instanceKey));

const config = {
  serviceUrl: "https://github.com/evanx/deno-date-iso/service.ts",
  requestStream: configMap.get("requestStream") as string,
  responseStream: configMap.get("responseStream") as string,
  consumerId: configMap.get("consumerId") as string,
  requestLimit: parseInt(configMap.get("requestLimit") as string || "0"),
  xreadGroupBlockMillis: 2000,
  replyExpireSeconds: 8,
};

if (await redis.hexists(instanceKey, "pid") === 1) {
  throw new Error(
    `Expecting instance hashes to have empty 'pid' field: ${instanceKey}`,
  );
}

await redis.hset(instanceKey, ["pid", Deno.pid]);

let requestCount = 0;

while (config.requestLimit === 0 || requestCount < config.requestLimit) {
  if ((await redis.hget(instanceKey, "pid")) !== String(Deno.pid)) {
    throw new Error("Aborting because 'pid' field removed/changed");
  }

  const [reply] = await redis.xreadgroup(
    [[config.requestStream, ">"]],
    {
      group: "service",
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
  const { id, service } = message.fieldValues;
  let code;
  let res;
  if (!id) {
    await redis.hincrby(instanceKey, "err:id", 1);
    continue;
  } else if (service !== config.serviceUrl) {
    await redis.hincrby(instanceKey, "err:service", 1);
    code = 400;
    res = { err: "service" };
  } else {
    code = 200;
    res = { data: new Date().toISOString() };
  }
  await redis.lpush(
    `res:${id}`,
    JSON.stringify(Object.assign({ code }, res)),
  );
  await redis.expire(`res:${id}`, config.replyExpireSeconds);
  await redis.xadd(config.responseStream, "*", { id, service, code });
  console.log(`Processed: ${id}`, res);
}

Deno.exit(0);
