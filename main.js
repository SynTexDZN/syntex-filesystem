const fs = require('fs'), path = require('path');

var ready = false, cache = {};

module.exports = class FileManager
{
	constructor(basePath, logger, initDirectories)
	{
		this.logger = logger;

		if(basePath != null)
		{
			try
			{
				var absPath = path.resolve(basePath);

				fs.accessSync(absPath, fs.constants.W_OK);

				this.basePath = absPath;

				if(initDirectories != null)
				{
					this.createDirectories(initDirectories);
				}

				ready = true;
			}
			catch(e)
			{
				this.logger.err(e);
			}
		}
		else
		{
			this.logger.log('error', 'bridge', 'Bridge', 'Es wurde kein Pfad für die Datensicherung angegeben!');
		}
	}

	isReady()
	{
		return ready;
	}

	createDirectories(directories)
	{
		if(this.isReady())
		{
			for(const i in directories)
			{
				var absPath = path.join(this.basePath, directories[i]);

				if(!fs.existsSync(absPath))
				{
					fs.mkdirSync(absPath);
				}
			}
		}
	}

	readFile(relPath)
	{
		return new Promise((resolve) => {

			if(this.isReady() && relPath != null)
			{
				var filePath = path.join(this.basePath, relPath);

				fs.readFile(filePath, (err, file) => {

					if(file && !err)
					{
						try
						{
							file = file.toString();

							if(path.parse(filePath).ext == '.json')
							{
								file = JSON.parse(file);
							}

							cache[filePath] = JSON.stringify(file);

							resolve(file);
						}
						catch(e)
						{
							resolve(null);
						}
					}
					else
					{
						this.logger.log('error', 'bridge', 'Bridge', '[' + path.parse(filePath).base + '] %read_error%! ' + err);

						resolve(null);
					}
				});
			}
			else
			{
				resolve(null);
			}
		});
	}

	writeFile(relPath, data)
	{
		return new Promise((resolve) => {

			if(this.isReady() && relPath != null)
			{
				var filePath = path.join(this.basePath, relPath);

				if(this.fileChanged(filePath, data))
				{
					if(path.parse(filePath).ext == '.json')
					{
						data = JSON.stringify(data, null, '\t');
					}

					fs.writeFile(filePath, data, (err) => {
						
						if(!err)
						{
							cache[filePath] = JSON.stringify(data);
						}
						else
						{
							this.logger.log('error', 'bridge', 'Bridge', '[' + path.parse(filePath).base + '] %update_error%! ' + err);
						}

						resolve(err == null);
					});
				}
				else
				{
					resolve(false);
				}
			}
			else
			{
				resolve(false);
			}
		});
	}

	fileChanged(filePath, data)
	{
		if(cache[filePath] != null && cache[filePath] == JSON.stringify(data))
		{
			return false;
		}
		
		return true;
	}
}