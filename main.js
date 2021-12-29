const fs = require('fs'), path = require('path');

var cache = {};

module.exports = class FileManager
{
	constructor(basePath, logger, initDirectories, enableCache)
	{
		this.logger = logger;
		this.enableCache = enableCache;

		if(basePath != null)
		{
			try
			{
				var absPath = path.resolve(basePath);

				fs.accessSync(absPath, fs.constants.W_OK);

				if(!fs.existsSync(absPath))
				{
					fs.mkdirSync(absPath);
				}

				this.basePath = absPath;

				if(initDirectories != null)
				{
					this.createDirectories(initDirectories);
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
		return new Promise((resolve) => {

			if(this.isReady() && filePath != null)
			{
				if(!path.isAbsolute(filePath))
				{
					filePath = path.join(this.basePath, filePath);
				}

				fs.readFile(filePath, (err, file) => {

					if(file && !err)
					{
						try
						{
							if(path.parse(filePath).ext == '.json')
							{
								file = JSON.parse(file.toString());
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

							resolve(null);
						}
					}
					else
					{
						this.logger.log('error', 'bridge', 'Bridge', '[' + path.parse(filePath).base + '] %read_error%!', err);

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
					if(path.parse(filePath).ext == '.json')
					{
						data = JSON.stringify(data, null, '\t');
					}

					fs.writeFile(filePath, data, (err) => {
						
						if(!err)
						{
							if(this.enableCache)
							{
								cache[filePath] = JSON.stringify(JSON.parse(data));
							}
						}
						else
						{
							this.logger.log('error', 'bridge', 'Bridge', '[' + path.parse(filePath).base + '] %update_error%!', err);
						}

						resolve({ success : err == null, changed : true });
					});
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

				fs.unlink(filePath, (err) => {
					
					resolve(err != null && err.code != 'ENOENT' ? false : true);
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

				fs.readdir(filePath, (err, files) => {

					if(files && !err)
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
}