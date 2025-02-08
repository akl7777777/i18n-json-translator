#!/bin/bash

echo "Starting custom translation test..."

# 检查 .env 文件
if [ -f .env ]; then
    echo "Found .env file"
    source .env
else
    echo "No .env file found"
fi

# 检查环境变量
if [ -z "$CUSTOM_API_KEY" ]; then
    echo "Error: CUSTOM_API_KEY is not set"
    echo "Please set your API key in .env file or export it directly"
    exit 1
fi

if [ -z "$CUSTOM_API_URL" ]; then
    echo "Error: CUSTOM_API_URL is not set"
    echo "Please set your API URL in .env file or export it directly"
    exit 1
fi

echo "Environment variables verified"
echo "API URL: $CUSTOM_API_URL"
echo "API Key: ${CUSTOM_API_KEY:0:5}..." # 只显示 API key 的前5个字符

echo "Running test..."
NODE_OPTIONS="--experimental-specifier-resolution=node" node --loader ts-node/esm examples/custom-test.ts
