const { getConfig } = require("./config");
const { vswhere } = require("./tool");
const child_process = require("child_process");
const path = require("path");
const chalk = require("chalk");
const { stat } = require("./utils");

// function iconvDecode(str) {
//   const iconv = require("iconv-lite");
//   if (str) {
//     const encoding = "utf-8";
//     const binaryEncoding = "binary";
//     return iconv.decode(Buffer.from(str, binaryEncoding), encoding);
//   }
//   return str;
// }

async function checkFindOldProducts() {
  const checkProducts = [
    {
      devCmd:
        "C:\\Program Files (x86)\\Microsoft Visual C++ Build Tools\\vcbuildtools.bat",
      instanceId: "Visual.Studio.2015",
      displayName:
        "Visual Studio 2015 (?) check it at C:\\Program Files (x86)\\Microsoft Visual C++ Build Tools",
    },
  ];
  const available = [];
  for (const p of checkProducts) {
    try {
      await stat(p.devCmd);
      available.push(p);
    } catch (_) {}
  }
  return available;
}

const childProcessOutput = (cmd) =>
  new Promise((resolve, reject) => {
    child_process.exec(cmd, { encoding: "utf-8" }, (err, stdout, stderr) => {
      if (err) {
        return reject(err);
      }
      resolve([stdout, stderr]);
    });
  });

class VS {
  async _init() {
    this.vswherePath = await vswhere.installedPath();
    this.vswhereProductFilter = `-products * -format json -utf8 -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64`;
    this.vswhereLegacyProductFilter = `-products * -format json -utf8 -legacy`;
  }

  async getProducts() {
    const current = await this._getSelectedProduct();
    const products = await this._products();
    const result = [];
    for (const p of products) {
      const begin = current.instanceId == p.instanceId ? "   X " : "     ";
      const id = `id: ${p.instanceId}`;
      const end = p.displayName ? ` (${p.displayName})` : "";
      result.push(begin + id + end);
    }
    return result.join("\n");
  }

  async setVS(vsInstanceId) {
    const products = await this._products();
    const product = products.find((x) => x.instanceId == vsInstanceId);
    if (!product) {
      throw `no product found by id ${vsInstanceId}, please select one of ${await this.getProducts()}`;
    }
    const config = await getConfig();
    await config.set("vsInstanceId", vsInstanceId);
  }

  ninjaMatcher() {
    return {
      matchOut: (line) => {
        {
          const lnk = line.split(/(warning\sLNK\d+:)/g);
          if (lnk.length === 3) {
            console.log(`| ${lnk[0]}${chalk.yellow(lnk[1])}${lnk[2]}`);
            return;
          }

          const comp = line.split(/(warning\sC\d+:)/g);
          if (comp.length === 3) {
            console.log(`| ${comp[0]}${chalk.yellow(comp[1])}${comp[2]}`);
            return;
          }
        }

        {
          const lnk = line.split(/(error\sLNK\d+:)/g);
          if (lnk.length === 3) {
            console.log(`| ${lnk[0]}${chalk.red(lnk[1])}${lnk[2]}`);
            return;
          }

          const comp = line.split(/(error\sC\d+:)/g);
          if (comp.length === 3) {
            console.log(`| ${comp[0]}${chalk.red(comp[1])}${comp[2]}`);
            return;
          }
        }

        const passMatcher = /(LINK\sPass\s\d:\scommand)\s(.*)\s(failed\s.*\swith\sthe\sfollowing\soutput:)/g;
        const pass = [...line.matchAll(passMatcher)];
        if (pass.length) {
          const begin = pass[0][1];
          const cmd = pass[0][2];
          const end = pass[0][3];
          console.log(`| ${chalk.red(begin)}`);
          console.log(
            cmd
              .split(" ")
              .map((x) => "  " + (x.startsWith("/") ? "" : "  ") + x)
              .join("\n")
          );
          console.log(`${chalk.red(end)}`);
          return;
        }

        console.log(`| ${line}`);
      },
      matchErr: (line) => {
        console.log(`| ${line}`);
      },
    };
  }

  async runInDevCmd(command, { matchOut, matchErr }) {
    const devCmdPath = await this._getDevCmd();
    await new Promise((resolve, reject) => {
      const proc = child_process.spawn(
        `cmd.exe`,
        ["/c", `("${devCmdPath}") & (cd "${process.cwd()}") & (${command})`],
        { windowsVerbatimArguments: true }
      );
      const rlout = require("readline").createInterface({ input: proc.stdout });
      const rlerr = require("readline").createInterface({ input: proc.stderr });
      rlout.on("line", matchOut);
      rlerr.on("line", matchErr);
      proc.on("close", (code) => {
        console.log(`child process exited with code ${code}`);
        resolve();
      });
    });
  }

  async _getDevCmd() {
    const product = await this._getSelectedProduct();
    return product.devCmd;
  }

  async _getSelectedProduct() {
    const config = await getConfig();
    const instanceId = config.get("vsInstanceId");
    let product = null;
    if (!instanceId) {
      product = await this._latestProduct();
    } else {
      product = await this._findProduct(instanceId);
    }
    return product;
  }

  async _products() {
    let stdout, stderr;
    [stdout, stderr] = await childProcessOutput(
      `${this.vswherePath} ${this.vswhereProductFilter}`
    );
    const products = JSON.parse(stdout);
    [stdout, stderr] = await childProcessOutput(
      `${this.vswherePath} ${this.vswhereLegacyProductFilter}`
    );
    const legacyProducts = JSON.parse(stdout);
    for (const p of legacyProducts) {
      if (products.find((x) => x.instanceId == p.instanceId)) {
        continue;
      }
      products.push(p);
    }
    for (const p of products) {
      p.devCmd = path.join(
        p.installationPath,
        "Common7",
        "Tools",
        "vsdevcmd.bat"
      );
    }
    for (const p of await checkFindOldProducts()) {
      products.push(p);
    }
    return products;
  }

  async _findProduct(id) {
    const products = (await this._products()).filter((x) => x.instanceId == id);
    if (products.length == 0) {
      throw `no visual studio products are available! (may be reload required)`;
    } else if (products.length > 1) {
      console.error(
        `error: too many visual studio products (probably this is a bug)`
      );
    }
    return products[0];
  }

  async _latestProduct() {
    const [stdout, stderr] = await childProcessOutput(
      `${this.vswherePath} -latest ${this.vswhereProductFilter}`
    );
    const products = JSON.parse(stdout);
    if (products.length == 0) {
      throw `no visual studio products are available! (may be reload required)`;
    } else if (products.length > 1) {
      console.error(
        `error: too many visual studio products (probably this is a bug)`
      );
    }
    return products[0];
  }
}

let vs = null;

async function getVS() {
  if (vs) {
    return vs;
  }
  vs = new VS();
  await vs._init();
  return vs;
}

module.exports = {
  getVS,
};
