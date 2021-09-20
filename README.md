# deno-date-iso

## main

The `main` script is equivalent to:

```
deno eval 'console.log(new Date().toISOString())'
```

Intended to be used to test a process runner e.g.:

```
deno run https://raw.githubusercontent.com/evanx/deno-date-iso/v0.0.1/main.ts
```

## service

The `service` script is an experimental Redis-driven microservice approach.

Latest: https://raw.githubusercontent.com/evanx/deno-date-iso/v0.0.2/service.ts

### cli

![image](https://user-images.githubusercontent.com/899558/133926057-af3cb1b3-229e-4dff-9a50-2767b300b526.png)

The `cli` script is used to test the `service` e.g.:

- `create-message-stream` the stream with `service` consumer group
- `setup-instance` to setup a service instance
- `xadd-message` to add a request to the stream

### demo

The `demo.sh` shell script can be used to demonstrate the `service` e.g. if you wish to delete the request stream if it already exists:

```shell
./demo.sh clear
```

This script will setup a worker key `deno-date-iso:1:h` as follows.

```
requestStream: deno-date-iso:req:x
responseStream deno-date-iso:res:x
consumerId 1
requestLimit 1
```

We will create the request stream with a consumer group `service` for collaborating workers to consume via `xreadgroup.` For the demo, we set `requestLimit` and `xadd` a single request, so that the service will process that single request only and then exit.
