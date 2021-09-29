const path = require("path");
const fs = require("fs");
const extract = require("extract-zip");
const superagent = require("superagent");
const child_process = require("child_process");
const readline = require("readline");

async function stat(p) {
  return fs.promises.stat(p);
}

async function mkdir(p) {
  await fs.promises.mkdir(p);
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

async function writeBuffer(p, buffer) {
  await fs.promises.writeFile(p, buffer);
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

function extractContentDispositionHeaderFilename(contentDisposition) {
  if (!contentDisposition) {
    return null;
  }

  const filenames = contentDisposition
    .split(";")
    .map((x) => x.trim())
    .filter((x) => x.startsWith("filename="));

  if (filenames.length != 1) {
    return null;
  }

  const filenameProperty = filenames[0].split("=");
  if (filenameProperty.length != 2) {
    return null;
  }

  return filenameProperty[1];
}

const downloadFile = async (url, path) => {
  const res = await superagent
    .get(url)
    .set("User-Agent", "ninja-master")
    .buffer(true)
    .parse(superagent.parse["application/octet-stream"])
    .redirects(8)
    .on("progress", (e) => {
      const bytes = e.total ? ` ${e.loaded}/${e.total} bytes` : "";
      console.log(`${e.direction}:${bytes} ${e.percent}%`);
    });

  if (!res.ok) {
    const text = res.text
      ? `, text: ${res.text}`
      : res.body
      ? `, text: ${res.body.toString()}`
      : "";
    throw new Error(
      `error getting file ${url}: status code ${res.statusCode}${text}`
    );
  }

  await writeBuffer(path, res.body);

  const filename = extractContentDispositionHeaderFilename(
    res.headers["content-disposition"]
  );
  if (!filename) {
    console.warn(
      `warn: failed to parse disposition header: ${contentDisposition}`
    );
    return "";
  }

  console.log(`filename: ${filename}`);

  return filename;
};

const createTmpFile = (ext) => {
  const tmp = require("tmp");
  tmp.setGracefulCleanup();
  return new Promise((resolve, reject) => {
    tmp.file({ postfix: ext, discardDescriptor: true }, (err, path) => {
      if (err) {
        return reject(err);
      }
      resolve(path);
    });
  });
};

const extractToDataDirectory = async (from) =>
  await extract(from, { dir: await dataDirectory() });

async function remove(path) {
  await fs.promises.rm(path, { recursive: true, force: true });
}

async function rename(a, b) {
  await fs.promises.rename(a, b);
}

async function copyToDataDirectory(file, resultName) {
  const p = path.join(await dataDirectory(), resultName);
  await fs.promises.copyFile(file, p);
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

async function executeBatFile(pathToBatFile, args, { matchOut, matchErr }) {
  return new Promise((resolve, reject) => {
    const cmd = `%SYSTEMROOT%\\System32\\chcp.com 65001 && "${pathToBatFile}" ${args}`;
    console.log(`spawning [cmd.exe /c ${cmd}]`);
    const proc = child_process.spawn(`cmd.exe`, ["/c", cmd], {
      windowsVerbatimArguments: true,
    });
    const rlout = readline.createInterface({ input: proc.stdout });
    const rlerr = readline.createInterface({ input: proc.stderr });
    rlout.on("line", matchOut);
    rlerr.on("line", matchErr);
    proc.on("close", (code) => {
      console.log(`child process exited with code ${code}`);
      if (code != 0) {
        return reject();
      }
      resolve();
    });
  });
}

module.exports = {
  remove,
  rename,
  stat,
  copyToDataDirectory,
  dataDirectory,
  jsonFileAbstract,
  jsonFile,
  downloadFile,
  createTmpFile,
  extractToDataDirectory,
  hasFile,
  executeBatFile,
};
