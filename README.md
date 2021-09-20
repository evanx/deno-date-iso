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

The `service` script is an experimental Redis-driven microservice approach:

- the microservice requires a Redis "worker key" as a CLI parameter
- the worker hashes provide configuration e.g. the `requestStream` key
- the worker sets and monitors the `pid` field to control its lifecycle
- the worker will `xreadgroup` using the `service` consumer group to processes requests
- the worker will push the response to a single-entry "list" which will expire after a few seconds

The intention is that other services can `xadd` requests, and `brpop` responses with a timeout.

Latest: https://raw.githubusercontent.com/evanx/deno-date-iso/v0.0.2/service.ts

### cli

![image](https://user-images.githubusercontent.com/899558/133970523-30f71676-6bb6-421c-84db-c936ba968019.png)

The `cli` script is used to test the `service` e.g.:

- `create-request-stream` - create the stream with `service` consumer group
- `setup-worker` - setup a worker instance
- `xadd-request` - add a request to the stream

### demo

The `demo.sh` shell script can be used to demonstrate the `service` script e.g. if you wish to delete the request stream if it already exists:

```shell
./demo.sh clear
```

![image](https://user-images.githubusercontent.com/899558/133971136-c85e4a90-c355-4b43-8362-3305ce475551.png)

This script will:

- create the request stream with a consumer group `service` for collaborating workers to consume via `xreadgroup`
- `xadd` a request to the stream
- setup a worker key `deno-date-iso:1:h`
- run the worker to process the added request
- pop the response by request ID

For the demo, we set `requestLimit` to `1` and `xadd` a single request, so that the service will process that single request only and then exit.
