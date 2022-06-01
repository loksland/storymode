#!/bin/bash
cd "`dirname "$0"`"

# Note: requires global npm package `jsdoc` installed
cd ../../

rm -r docs


# See: https://jsdoc.app/about-commandline.html
jsdoc tools/docs-generate/extra-docs src  -c tools/docs-generate/conf.json -r -d docs --readme tools/docs-generate/README.md --verbose


$SHELL
