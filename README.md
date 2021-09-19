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

## cli

The `cli` script is used to test the `service` e.g.:

- `create` the stream with `service` consumer group
- `set-instance` to setup a service instance
- `xadd` to add a request to the stream

## demo

The `demo.sh` shell script can be used to demonstrate the `service`
