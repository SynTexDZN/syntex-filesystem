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

	readFile(filePath)
	{
		return new Promise((resolve, reject) => {

			if(this.isReady() && filePath != null)
			{
				if(!path.isAbsolute(filePath))
				{
					filePath = path.join(this.basePath, filePath);
				}

				fs.readFile(filePath, { encoding : 'utf8' }, (error, file) => {

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
								cache[filePath] = JSON.stringify(file);
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
									cache[filePath] = JSON.stringify(JSON.parse(data));
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
						var fileArray = [];

						for(const i in files)
						{
							if(fs.statSync(path.join(filePath, files[i])).isFile())
							{
								try
								{
									var obj = JSON.parse(fs.readFileSync(path.join(filePath, files[i])).toString());

									obj.id = path.parse(files[i]).name;

									fileArray.push(obj);
								}
								catch(e)
								{
									this.logger.log('error', 'bridge', 'Bridge', '[' + path.parse(files[i]).base + '] %parse_error%!', e);
								}
							}
						}

						resolve(fileArray);
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
		if(this.enableCache && cache[filePath] != null && cache[filePath] == JSON.stringify(data))
		{
			return false;
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
			if(this.query[id].filePath == filePath)
			{
				this.writeFile(this.query[id].filePath, this.query[id].data).then((response) => this.query[id].resolve(response));

				return id;
			}
		}
	}
}