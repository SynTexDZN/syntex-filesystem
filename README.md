# SynTex Filesystem
An intelligent file system for reading and writing files.

[![NPM Recommended Version](https://img.shields.io/npm/v/syntex-filesystem?label=release&color=brightgree&style=for-the-badge)](https://www.npmjs.com/package/syntex-filesystem)
[![NPM Beta Version](https://img.shields.io/npm/v/syntex-filesystem/beta?color=orange&label=beta&style=for-the-badge)](https://www.npmjs.com/package/syntex-filesystem)
[![NPM Downloads](https://img.shields.io/npm/dt/syntex-filesystem?color=9944ee&&style=for-the-badge)](https://www.npmjs.com/package/syntex-filesystem)
[![GitHub Commits](https://img.shields.io/github/commits-since/SynTexDZN/syntex-filesystem/1.0.0?color=yellow&label=commits&style=for-the-badge)](https://github.com/SynTexDZN/syntex-filesystem/commits)
[![GitHub Code Size](https://img.shields.io/github/languages/code-size/SynTexDZN/syntex-filesystem?color=0af&style=for-the-badge)](https://github.com/SynTexDZN/syntex-filesystem)

<br>

## Use This In Your Code
```js
let Logger = require('syntex-logger'),
    FileSystem = require('syntex-filesystem');

let logger = new Logger({ pluginName : 'Demo Plugin' }, { language : 'us', levels : { debug : false }, time : true });

logger.setLogDirectory('/var/demo_plugin/logs');

let files = new FileSystem({ logger, baseDirectory : '/var/demo_plugin/' }, { initDirectories : ['example', 'logs'], enableCache : false });

var filePath = '/example/demo.json',
    exampleContent = { a : 1, b : 2 };

files.writeFile(filePath, exampleContent).then((response) => {

    logger.debug(response);

    files.readFile(filePath).then((data) => {
        
        logger.debug(data);

    }).catch((error) => {

        if(error != null)
        {
            logger.err(error);
        }
    });
});
```
## Troubleshooting
#### [![GitHub Issues](https://img.shields.io/github/issues-raw/SynTexDZN/syntex-filesystem?logo=github&style=for-the-badge)](https://github.com/SynTexDZN/syntex-filesystem/issues)
- `Report` us your `Issues`
- `Join` our `Discord Server`
#### [![Discord](https://img.shields.io/discord/442095224953634828?color=5865F2&logoColor=white&label=discord&logo=discord&style=for-the-badge)](https://discord.gg/XUqghtw4DE)