import * as log from "https://deno.land/std@0.106.0/log/mod.ts";
import * as Colors from "https://deno.land/std/fmt/colors.ts";
import { ArrayReply, connect } from "https://deno.land/x/redis/mod.ts";
import { unflattenRedis } from "./utils.ts";

const commands = [
  { key: "info", description: "Show info on the request stream", args: [] },
  {
    key: "show-default-setup",
    description: "Show the default service configuration",
    args: [],
  },
  {
    key: "create-request-stream",
    description: "Create the request message stream",
    args: [],
  },
  {
    key: "delete-request-stream",
    description: "Delete the request message stream",
    args: [],
  },
  {
    key: "setup-worker",
    description: "Setup hashes for a worker",
    args: ["consumerId"],
  },
  {
    key: "show-worker",
    description: "Show a worker's hashes",
    args: ["consumerId"],
  },
  {
    key: "xadd-request",
    description: "Add a request item to the request stream",
    args: ["requestId"],
  },
  {
    key: "xrange-request",
    description: "Show messages in the request stream",
    args: [],
  },
  {
    key: "xtrim-request",
    description: "Trim the request stream",
    args: ["maxlength"],
  },
  {
    key: "xtrim-response",
    description: "Trim the response stream",
    args: ["maxlength"],
  },
  {
    key: "xrange-response",
    description: "Show messages in the response stream",
    args: [],
  },
];

const serviceUrl = "https://github.com/evanx/deno-date-iso/service.ts";
const serviceVersion = "0.0.1";
const servicePrefix = "deno-date-iso";
const requestStreamKey = `${servicePrefix}:req:x`;
const responseStreamKey = `${servicePrefix}:res:x`;

console.log(
  `Stream: ${Colors.blue(requestStreamKey)}, command: ${Deno.args.join(" ")}`,
);

const redis = await connect({
  hostname: "127.0.0.1",
  port: 6379,
});

if (Deno.args.length === 0) {
  await info();
} else if (Deno.args.length === 1) {
  const command = Deno.args[0];
  if (command === "info") {
    await info();
  } else if (command === "delete-request-stream") {
    await redis.executor.exec(
      "del",
      requestStreamKey,
    );
    Deno.exit(0);
  } else if (command === "create-request-stream") {
    try {
      await redis.executor.exec(
        "xgroup",
        "create",
        requestStreamKey,
        "service",
        "0",
        "mkstream",
      );
      Deno.exit(0);
    } catch (err) {
      if (/^-BUSYGROUP/.test(err.message)) {
        console.log(`${Colors.yellow("Stream exists:")} ${requestStreamKey}`);
      }
      Deno.exit(1);
    }
  } else if (command === "show-default-setup") {
    console.log(`${Colors.cyan("streamKey")} ${requestStreamKey}`);
  } else if (command === "xtrim-request") {
    console.error(`Provide arg: <maxlen>`);
  } else if (command === "xtrim-response") {
    console.error(`Provide arg: <maxlen>`);
  } else if (command === "xadd-request") {
    console.error(`Provide arg: <id>`);
  } else if (command === "xrange-request") {
    const xrangeReply = await redis.xrange(
      `${servicePrefix}:req:x`,
      "-",
      "+",
      99,
    );
    console.log(xrangeReply);
  } else if (command === "xrange-response") {
    const xrangeReply = await redis.xrange(
      responseStreamKey,
      "-",
      "+",
      99,
    );
    console.log(xrangeReply);
  } else if (command === "setup-worker") {
    console.error(`Provide arg: <id>`);
  } else if (command === "show-worker") {
    console.error(`Provide arg: <id>`);
  } else {
    console.error("Usage: <command>");
    console.error(
      "Commands:\n" +
        commands.map((item) =>
          `  ${Colors.cyan(item.key)} - ${Colors.gray(item.description)}`
        ).join(
          "\n",
        ),
    );
    if (command === "help") {
      Deno.exit(0);
    } else {
      console.error(`Unsupported command without args: ${command}`);
    }
    await info();
  }
  Deno.exit(1);
} else if (Deno.args.length === 2) {
  const command = Deno.args[0];
  const arg = Deno.args[1];
  if (command === "setup-worker") {
    const workerKey = `${servicePrefix}:${arg}:h`;
    await redis.del(workerKey);
    await redis.hmset(workerKey, ["service", serviceUrl], [
      "version",
      serviceVersion,
    ], [
      "requestStream",
      requestStreamKey,
    ], [
      "consumerId",
      arg,
    ]);
    console.log(
      `${Colors.green(workerKey)}`,
      unflattenRedis(await redis.hgetall(workerKey)),
    );
  } else if (command === "show-worker") {
    const workerKey = `${servicePrefix}:${arg}:h`;
    console.log(
      `${Colors.green(workerKey)}`,
      unflattenRedis(await redis.hgetall(workerKey)),
    );
  } else if (command === "xtrim-request") {
    const elements = parseInt(arg);
    const reply = await redis.xtrim(requestStreamKey, {
      elements,
    });
  } else if (command === "xtrim-response") {
    const elements = parseInt(arg);
    const reply = await redis.xtrim(responseStreamKey, {
      elements,
    });
  } else if (command === "xadd-request") {
    const id = arg;
    const reply = await redis.xadd(requestStreamKey, "*", {
      id,
      service: serviceUrl,
    });
    console.log(reply);
  } else {
    console.error(`Unsupported command with 1 arg: ${command}`);
    Deno.exit(1);
  }
  Deno.exit(0);
}

async function info() {
  try {
    const xinfoReply = (await redis.executor.exec(
      "xinfo",
      "groups",
      requestStreamKey,
    )) as ArrayReply;
    if (!xinfoReply.value().length) {
      console.error(`Stream has no consumer groups yet`);
    } else if (xinfoReply.value().length > 1) {
      console.error(`Stream has multiple consumer groups`);
    } else {
      const xinfoMap = unflattenRedis(xinfoReply.value()[0] as string[]);
      console.log(
        `Group:\n` +
          Array.from(xinfoMap.entries()).map(([key, value]) =>
            `${Colors.cyan(String(key))} ${value}`
          )
            .join("\n"),
      );
    }
    Deno.exit(0);
  } catch (err) {
    if (/no such key/.test(err.message)) {
      console.error(`Stream does not exist: ${requestStreamKey}`);
    } else {
      console.error(err);
    }
    Deno.exit(1);
  }
}
