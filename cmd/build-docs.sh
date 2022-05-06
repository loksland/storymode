#!/bin/bash
cd "`dirname "$0"`"

# Note: requires global npm package `jsdoc` installed
cd ../

jsdoc src -c cmd/conf.json -r -d wiki/docs


$SHELL

