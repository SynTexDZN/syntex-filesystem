const fs = require('fs'), path = require('path');

var cache = {};

module.exports = class FileManager
{
	constructor(platform, options)
	{
		this.running = [];
		this.query = {};

		this.logger = platform.logger;
		
		this.enableCache = options.enableCache;

		if(platform.baseDirectory != null)
		{
			try
			{
				var absPath = path.resolve(platform.baseDirectory);

				fs.accessSync(absPath, fs.constants.W_OK);

				if(!fs.existsSync(absPath))
				{
					fs.mkdirSync(absPath);
				}

				this.basePath = absPath;

				if(options.initDirectories != null)
				{
					this.createDirectories(options.initDirectories);
				}
			}
			catch(e)
			{
				this.logger.err(e);
			}
		}
		else
		{
			this.logger.log('error', 'bridge', 'Bridge', '%no_base_path%!');
		}
	}

	isReady()
	{
		return this.basePath != null;
	}

	createDirectories(directories)
	{
		if(this.isReady())
		{
			for(const directory of directories)
			{
				this.createDirectory(directory);
			}
		}
	}

	createDirectory(directoryPath)
	{
		if(this.isReady())
		{
			if(!path.isAbsolute(directoryPath))
			{
				directoryPath = path.join(this.basePath, directoryPath);
			}

			if(!fs.existsSync(directoryPath))
			{
				fs.mkdirSync(directoryPath);

				return true;
			}
		}

		return false;
	}

	readFile(filePath)
	{
		return new Promise((resolve, reject) => {

			if(this.isReady() && filePath != null)
			{
				var options = {};
				
				if(!path.isAbsolute(filePath))
				{
					filePath = path.join(this.basePath, filePath);
				}

				if(path.parse(filePath).ext == '.json' || path.parse(filePath).ext == '.txt')
				{
					options.encoding = 'utf8';
				}

				fs.readFile(filePath, options, (error, file) => {

					if(file != null && error == null)
					{
						try
						{
							if(path.parse(filePath).ext == '.json')
							{
								file = JSON.parse(file);
							}

							if(this.enableCache)
							{
								if(path.parse(filePath).ext == '.json')
								{
									cache[filePath] = JSON.stringify(file);
								}
								else
								{
									cache[filePath] = file;
								}
							}

							resolve(file);
						}
						catch(e)
						{
							this.logger.log('error', 'bridge', 'Bridge', '[' + path.parse(filePath).base + '] %parse_error%!', e);

							reject(e);
						}
					}
					else
					{
						this.logger.log('error', 'bridge', 'Bridge', '[' + path.parse(filePath).base + '] %read_error%!', error);

						if(error != null && error.code != 'ENOENT')
						{
							reject(error);
						}
						else
						{
							resolve(null);
						}
					}
				});
			}
			else
			{
				reject();
			}
		});
	}

	writeFile(filePath, data)
	{
		return new Promise((resolve) => {

			if(this.isReady() && filePath != null)
			{
				if(!path.isAbsolute(filePath))
				{
					filePath = path.join(this.basePath, filePath);
				}

				if(this.fileChanged(filePath, data))
				{
					if(!this.running.includes(filePath))
					{
						this.running.push(filePath);

						if(path.parse(filePath).ext == '.json')
						{
							data = JSON.stringify(data, null, '\t');
						}

						fs.writeFile(filePath, data, (error) => {
							
							if(!error)
							{
								if(this.enableCache)
								{
									if(path.parse(filePath).ext == '.json')
									{
										cache[filePath] = JSON.stringify(JSON.parse(data));
									}
									else
									{
										cache[filePath] = data;
									}
								}
							}
							else
							{
								this.logger.log('error', 'bridge', 'Bridge', '[' + path.parse(filePath).base + '] %update_error%!', error);
							}

							this.running.splice(this.running.indexOf(filePath), 1);

							resolve({ success : error == null, changed : true });

							delete this.query[this._runQuery(filePath)];
						});
					}
					else
					{
						this._addQuery({ filePath, data, resolve });
					}
				}
				else
				{
					resolve({ success : true, changed : false });
				}
			}
			else
			{
				resolve({ success : false, changed : false });
			}
		});
	}

	deleteFile(filePath)
	{
		return new Promise((resolve) => {

			if(this.isReady() && filePath != null)
			{
				if(!path.isAbsolute(filePath))
				{
					filePath = path.join(this.basePath, filePath);
				}

				fs.unlink(filePath, (error) => {
					
					resolve(error != null && error.code != 'ENOENT' ? false : true);
				});
			}
			else
			{
				resolve(false);
			}
		});
	}

	readDirectory(filePath)
	{
		return new Promise((resolve) => {

			if(this.isReady() && filePath != null)
			{
				if(!path.isAbsolute(filePath))
				{
					filePath = path.join(this.basePath, filePath);
				}

				fs.readdir(filePath, (error, files) => {

					if(files && !error)
					{
						var fileArray = {}, promiseArray = [];

						for(const file of files)
						{
							if(fs.statSync(path.join(filePath, file)).isFile())
							{
								promiseArray.push(this.readFile(path.join(filePath, file)).then((content) => {

									fileArray[file] = content;
								}));
							}
						}

						Promise.all(promiseArray).then(() => resolve(fileArray));
					}
					else
					{
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

	fileChanged(filePath, data)
	{
		if(this.enableCache && cache[filePath] != null)
		{
			if((path.parse(filePath).ext == '.json' && cache[filePath] == JSON.stringify(data))
			|| (path.parse(filePath).ext != '.json' && cache[filePath] == data))
			{
				return false;
			}
		}

		return true;
	}

	_addQuery(query)
	{
		var id = 0, keys = Object.keys(this.query);

		if(keys.length > 0)
		{
			id = parseInt(keys[keys.length - 1]) + 1;
		}

		this.query[id] = query;
	}

	_runQuery(filePath)
	{
		for(const id in this.query)
		{
			const file = this.query[id];

			if(file.filePath == filePath)
			{
				this.writeFile(file.filePath, file.data).then((response) => file.resolve(response));

				return id;
			}
		}
	}
}