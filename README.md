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

![image](https://user-images.githubusercontent.com/899558/133970603-0ef7353c-7a39-4760-8364-e8ee0a1f20c0.png)

This script will:

- create the request stream with a consumer group `service` for collaborating workers to consume via `xreadgroup`
- `xadd` a request to the stream
- setup a worker key `deno-date-iso:1:h`
- run the worker to process the added request

For the demo, we set `requestLimit` to `1` and `xadd` a single request, so that the service will process that single request only and then exit.
