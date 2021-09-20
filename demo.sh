#!/bin/bash
set -eu

redish() {
  deno -q run --allow-net=127.0.0.1:6379 https://raw.githubusercontent.com/evanx/deno-redish/v0.0.2/main.ts "${@}" 
}

epoch=`deno eval 'console.log(Date.now())'`

if [ ${#} -eq 1 ]
then
  if [ "${1}" = 'clear' ]
  then
    deno run --allow-net=127.0.0.1:6379 ./cli.ts delete-request-stream ||
      echo "ERR: delete-request-stream"
    deno run --allow-net ./cli.ts xtrim-response 0 || 
      echo 'ERR: xtrim-response'
  else
    echo "Invalid arg: ${1}"
    exit 1
  fi
elif [ ${#} -ne 0 ]
then
  echo "Invalid args: ${@}"
  exit 1
fi

# create request stream
if redis-cli exists deno-date-iso:req:x | grep -q ^0$
then
  if ! deno run --allow-net=127.0.0.1:6379 ./cli.ts create-request-stream
  then
    echo "ERR create-request-stream"
  fi
fi

# add item request stream with request id 1234
deno run --allow-net=127.0.0.1:6379 ./cli.ts xadd-request 1234

echo "> xrange deno-date-iso:req:x"
redis-cli xrange deno-date-iso:req:x - +

# setup worker 1 to process only 1 request message
echo "# Worker hashes key: deno-date-iso:1:h"
redis-cli del deno-date-iso:1:h | grep -q '^[0-1]$'
redis-cli hmset deno-date-iso:1:h \
  requestStream deno-date-iso:req:x \
  responseStream deno-date-iso:res:x \
  consumerId 1 \
  requestLimit 1 | grep -q '^OK$'
redish deno-date-iso:1:h

# run worker 1
echo "# Running service"
deno run --allow-net=127.0.0.1:6379 ./service.ts deno-date-iso:1:h

echo "> rpop res:1234"
redis-cli --raw rpop res:1234

echo
echo "> xrange deno-date-iso:res:x"
redis-cli xrange deno-date-iso:res:x - +
