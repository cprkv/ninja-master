const path = require("path");
const moment = require("moment");
const {
  stat,
  dataDirectory,
  jsonFile,
  remove,
  rename,
  downloadFile,
  copyToDataDirectory,
  createTmpFile,
  extractToDataDirectory,
  executeBatFile,
} = require("./utils");
const superagent = require("superagent");

class Tool {
  // name: tool name
  // github: user/repo, example: "ninja-build/ninja"
  constructor({ name, exeName, github, filePattern, needsExtract }) {
    this.name = name;
    this.exeName = exeName;
    this.github = github;
    this.filePattern = filePattern;
    this.needsExtract = needsExtract;
    this.toolReleaseCache = {
      write: (obj) => jsonFile.write(`${name}-releases.json`, obj),
      read: () => jsonFile.read(`${name}-releases.json`),
    };
    this.installedToolCache = {
      write: (obj) => jsonFile.write(`${name}-installed.json`, obj),
      read: () => jsonFile.read(`${name}-installed.json`),
    };
  }

  async fetch() {
    const res = await superagent
      .get(`https://api.github.com/repos/${this.github}/releases`)
      .set("User-Agent", "ninja-master")
      .set("Accept", "application/json");
    await this.toolReleaseCache.write(res.body);
  }

  async installedVersion() {
    let installed;
    try {
      installed = await this.installedToolCache.read();
    } catch (_) {}
    return installed;
  }

  async installedPath() {
    const installedToolPath = path.join(await dataDirectory(), this.exeName);
    try {
      await stat(installedToolPath);
    } catch (_) {
      throw `can't stat ${installedToolPath}, probably some error while installing...`;
    }
    return installedToolPath;
  }

  async versions() {
    const installed = await this.installedVersion();
    const releases = await this._getReleases();
    const str = [];
    for (const release of releases) {
      const mark = release.tag == installed ? "X" : " ";
      const date = moment(release.date).format("D MMMM YYYY");
      str.push(`   ${mark} ${release.tag}\t${date}`);
    }
    return str.join("\n");
  }

  async install(version) {
    const installed = await this.installedVersion();
    if (version) {
      if (installed && installed == version) {
        console.log(`version ${version} already installed!`);
        return;
      }
    }

    const releases = await this._getReleases();
    const release = version
      ? releases.find((r) => r.tag == version)
      : releases[0];

    if (!release) {
      console.log(
        `error: there's no ${this.name} release ${version}, available releases:`
      );
      console.log(await this.versions());
      return;
    } else if (!version && installed && installed == release.tag) {
      console.log(`version ${installed} already installed!`);
      return;
    }

    if (!version) {
      console.log(`latest ${this.name} release: ${release.tag}`);
    }

    const matchReleases = this.filePattern
      ? release.assets.filter((ass) => ass.name.match(this.filePattern))
      : release.assets;

    if (matchReleases.length != 1) {
      console.log("something went wrong... match asset not found.");
      console.log(
        "available assets: " + release.assets.map((ass) => ass.name).join(", ")
      );
      console.log(
        "match assets: " + matchReleases.map((ass) => ass.name).join(", ")
      );
    }

    const releaseUrl = matchReleases[0].url;

    console.log(`downloading ${releaseUrl}...`);
    const tmpFilePath = await createTmpFile(this.needsExtract ? ".zip" : null);
    const originFilename = await downloadFile(releaseUrl, tmpFilePath);

    console.log(`temporary file downloaded to ${tmpFilePath}`);

    if (this.needsExtract) {
      await extractToDataDirectory(tmpFilePath);
    } else {
      await copyToDataDirectory(tmpFilePath, this.exeName);
    }

    await this._installAdditionalActions(originFilename);

    const installedToolPath = await this.installedPath();
    await this.installedToolCache.write(release.tag);
    console.log(`${this.name} installed to ${installedToolPath}`);
  }

  async remove() {
    const installed = await this.installedVersion();
    if (!installed) {
      throw `no ${this.name} versions is currently installed!`;
    }

    const installedToolPath = path.join(await dataDirectory(), this.exeName);
    await remove(installedToolPath);
    await this.installedToolCache.write("");
  }

  //--------------------

  async _installAdditionalActions(originFilename) {}

  async _getReleases() {
    let releases;
    try {
      releases = await this.toolReleaseCache.read();
    } catch (_) {
      console.log(`error read ${this.name} releases cache, fetching...`);
      await this.fetch();
      releases = await this.toolReleaseCache.read();
    }
    return releases
      .filter(
        (release) =>
          ((release.assets && release.assets.length) ||
            (this.needsExtract && release.zipball_url)) &&
          !release.prerelease
      )
      .map((release) => ({
        tag: release.tag_name,
        date: release.published_at,
        assets:
          release.assets && release.assets.length
            ? release.assets.map((asset) => ({
                type: asset.content_type,
                name: asset.name,
                url: asset.browser_download_url,
              }))
            : [{ type: "application/zip", url: release.zipball_url }],
      }));
  }
}

class VCPkgTool extends Tool {
  constructor(obj) {
    super(obj);
  }

  async _installAdditionalActions(originFilename) {
    console.log("additional installation actions on vcpkg!");

    const dataDir = await dataDirectory();
    const toolDir = path.join(dataDir, "vcpkg");

    // rename stuff
    {
      const hash = VCPkgTool._parseHash(originFilename);
      const extractedDir = path.join(dataDir, `microsoft-vcpkg-${hash}`);
      console.log(`extractedDir: ${extractedDir}`);

      try {
        await this.remove(true);
      } catch (err) {
        console.warn(
          `warn: can't remove ${toolDir}, probably it does not exists?`
        );
      }

      await rename(extractedDir, toolDir);
    }

    await executeBatFile(
      path.join(toolDir, "bootstrap-vcpkg.bat"),
      "-disableMetrics",
      {
        matchOut: console.log,
        matchErr: console.log,
      }
    );

    console.log("additional installation actions on vcpkg done!");
  }

  async remove(silent = false) {
    const installed = await this.installedVersion();
    const installedToolPath = path.join(await dataDirectory(), "vcpkg");

    try {
      await remove(installedToolPath);
    } catch (err) {
      if (silent) {
        console.warn(`warn: remove: ${err}`);
      } else if (installed) {
        throw err;
      }
    }

    await this.installedToolCache.write("");
  }

  async toolchainPath() {
    return path.join(
      await dataDirectory(),
      "vcpkg",
      "scripts",
      "buildsystems",
      "vcpkg.cmake"
    );
  }

  static _parseHash(name) {
    const reg = name.match(/-g(?<hash>[0-9a-f]+)\.zip$/);
    if (!reg.groups || !reg.groups.hash || !reg.groups.hash.length) {
      throw `failed to parse hash from ${name}`;
    }
    return reg.groups.hash;
  }
}

const ninja = new Tool({
  name: "ninja",
  exeName: "ninja.exe",
  github: "ninja-build/ninja",
  filePattern: /win\.zip/g,
  needsExtract: true,
});
const vswhere = new Tool({
  name: "vswhere",
  exeName: "vswhere.exe",
  github: "microsoft/vswhere",
  filePattern: /\.exe/g,
  needsExtract: false,
});
const vcpkg = new VCPkgTool({
  name: "vcpkg",
  exeName: "vcpkg/vcpkg.exe",
  github: "microsoft/vcpkg",
  needsExtract: true,
});
const tools = [ninja, vswhere, vcpkg];

module.exports = {
  Tool,
  tools,
  ninja,
  vswhere,
  vcpkg,
};
