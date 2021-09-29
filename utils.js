const path = require("path");
const fs = require("fs");
const extract = require("extract-zip");
const superagent = require("superagent");

function stat(p) {
  return new Promise((resolve, reject) => {
    fs.stat(p, (err, stat) => {
      if (err) {
        return reject(err);
      }
      resolve(stat);
    });
  });
}

function mkdir(p) {
  return new Promise((resolve, reject) => {
    fs.mkdir(p, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

async function dataDirectory() {
  const p = path.join(__dirname, "data");

  try {
    await stat(p);
  } catch (_) {
    await mkdir(p);
  }

  return p;
}

const jsonFileAbstract = {
  write: (p, object, beautify) =>
    new Promise((resolve, reject) => {
      const str = beautify
        ? JSON.stringify(object, null, 2)
        : JSON.stringify(object);
      fs.writeFile(p, str, "utf-8", (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    }),
  read: (p) =>
    new Promise((resolve, reject) => {
      fs.readFile(p, "utf-8", (err, data) => {
        if (err) {
          return reject(err);
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }),
};

const jsonFile = {
  write: async function (name, object) {
    const p = path.join(await dataDirectory(), name);
    return jsonFileAbstract.write(p, object);
  },
  read: async function (name) {
    const p = path.join(await dataDirectory(), name);
    return jsonFileAbstract.read(p);
  },
};

const downloadFile = async (url, path) => {
  return new Promise((resolve, reject) => {
    superagent.get(url).pipe(fs.createWriteStream(path)).on("finish", resolve);
  });
};

const createTmpFile = (ext) => {
  const tmp = require("tmp");
  tmp.setGracefulCleanup();
  return new Promise((resolve, reject) => {
    tmp.file({ postfix: ext, discardDescriptor: true }, function (err, path) {
      if (err) {
        return reject(err);
      }
      resolve(path);
    });
  });
};

const extractToDataDirectory = async (from) =>
  await extract(from, { dir: await dataDirectory() });

function remove(path) {
  return new Promise((resolve, reject) => {
    fs.unlink(path, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

async function copyToDataDirectory(file, resultName) {
  const p = path.join(await dataDirectory(), resultName);
  return new Promise((resolve, reject) => {
    fs.copyFile(file, p, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

async function hasFile(name) {
  let s;
  try {
    s = await stat(name);
  } catch {
    return false;
  }
  return s.isFile();
}

module.exports = {
  remove,
  stat,
  copyToDataDirectory,
  dataDirectory,
  jsonFileAbstract,
  jsonFile,
  downloadFile,
  createTmpFile,
  extractToDataDirectory,
  hasFile,
};
