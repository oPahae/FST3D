#!/bin/sh
# usage: sh qa/run.sh qa/shots.mjs   (run `npm run build` first; starts vite preview, runs the script, stops the server)
npx vite preview --port 4173 > /tmp/fst-preview.log 2>&1 &
SP=$!
sleep 3
node "$@"
RC=$?
kill $SP 2>/dev/null
exit $RC
