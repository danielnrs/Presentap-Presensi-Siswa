#!/bin/bash

export DATABASE_URL="DATABASE_URL="mysql://root:@localhost:3306/presentap"

nohup node .output/server/index.mjs > app.log 2>&1 &
