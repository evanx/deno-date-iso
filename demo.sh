#!/bin/bash
set -eu

redish() {
  deno -q run --allow-net=127.0.0.1:6379 https://raw.githubusercontent.com/evanx/deno-redish/v0.0.2/main.ts "${@}" 
}

deno run --allow-net ./cli.ts xadd 1
sleep .1
redish deno-date-iso:1:h
redis-cli --raw rpop reply:1
redis-cli xrange deno-date-iso:reply:x - +
