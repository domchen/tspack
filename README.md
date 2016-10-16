[![npm version](https://badge.fury.io/js/tspack.svg)](https://badge.fury.io/js/tspack)

# Introduction

tspack is a bundler for typescript modules. Packs many modules into a few bundled assets. Allows to split your codebase into multiple bundles, which can be loaded on demand.


# Installation

project:
`npm install tspack`

global:
`npm install tspack -g`


# Example

tsconfig.json : 

```
{
  "compilerOptions": {
    "outDir": "bin-debug",
    "target": "ES5",
    "declaration": true,
    "accessorOptimization": true,
    "emitReflection": true,
    "reorderFiles": true,
    "defines": {
      "DEBUG": false,
      "LANGUAGE": "en_US"
    }
  },
  "modules": [
    {
      "name": "core",
      "exclude": [
        "node_modules"
      ],
      "dependencies": []
    },
    {
      "name": "web",
      "declaration": false, // Override the default compiler options defined above.
      "exclude": [
        "node_modules"
      ],
      "dependencies": [
        "core"
      ]
    }
  ]
}

```