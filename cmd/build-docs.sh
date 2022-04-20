#!/bin/bash
cd "`dirname "$0"`"

# Note: requires global npm package `jsdoc` installed
cd ../

jsdoc src -r -d wiki/docs


$SHELL

