#!/bin/sh

# Ensure the script stops if any command fails
set -e

# Run the first npm command and move folder
npm run generate:node:memory
mkdir -p dist
mv dist/_nuxt dist/_nuxt
mv .output/public ./dist-node-memory

# Run the second npm command and move folder
npm run generate:node:docker
mkdir -p dist
mv dist/_nuxt dist/_nuxt
mv .output/public ./dist-node-docker

# Run the final npm command
npm run generate
mkdir -p dist
mv dist/_nuxt dist/_nuxt