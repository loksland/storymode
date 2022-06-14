#!/bin/bash
cd "`dirname "$0"`"

# Note: requires global npm package `jsdoc` installed
cd ../../

rm -r docs


# See: https://jsdoc.app/about-commandline.html
jsdoc utilities/docs-generate/extra-docs src  -c utilities/docs-generate/conf.json -r -d docs --readme utilities/docs-generate/README.md --verbose


$SHELL
