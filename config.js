const { jsonFile } = require("./utils");

class Config {
  constructor(name) {
    this.file = {
      write: (obj) => jsonFile.write(name, obj),
      read: () => jsonFile.read(name),
    };
  }

  async set(prop, value) {
    this.obj[prop] = value;
    return this.file.write(this.obj);
  }

  get(prop) {
    return this.obj[prop];
  }

  async _init() {
    try {
      this.obj = await this.file.read();
    } catch (_) {
      this.obj = {};
    }
  }
}

let config = null;

async function getConfig() {
  if (config) {
    return config;
  }
  config = new Config("config.json");
  await config._init();
  return config;
}

module.exports = {
  getConfig,
};
