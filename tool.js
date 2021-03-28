const path = require("path");
const moment = require("moment");
const {
  stat,
  dataDirectory,
  jsonFile,
  remove,
  downloadFile,
  copyToDataDirectory,
  createTmpFile,
  extractToDataDirectory,
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

  async versions() {
    let installed;
    try {
      installed = await this.installedToolCache.read();
    } catch (_) {}
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
    let installed;
    try {
      installed = await this.installedToolCache.read();
    } catch (_) {}

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
    const tmpFilePath = await createTmpFile(
      this.needsExtract ? ".zip" : null
    );
    await downloadFile(releaseUrl, tmpFilePath);

    console.log(`temporary file downloaded to ${tmpFilePath}`);

    if (this.needsExtract) {
      await extractToDataDirectory(tmpFilePath);
    } else {
      await copyToDataDirectory(tmpFilePath, this.exeName);
    }

    const installedToolPath = path.join(await dataDirectory(), this.exeName);
    try {
      await stat(installedToolPath);
    } catch (_) {
      throw `can't stat ${installedToolPath}, probably some error while downloading...`;
    }

    await this.installedToolCache.write(release.tag);
    console.log(`${this.name} installed to ${installedToolPath}`);
  }

  async remove() {
    let installed;
    try {
      installed = await this.installedToolCache.read();
    } catch (_) {}

    if (!installed) {
      console.log(`no ${this.name} versions is currently installed!`);
      return;
    }

    const installedToolPath = path.join(await dataDirectory(), this.exeName);
    await remove(installedToolPath);
    await this.installedToolCache.write("");
  }

  //--------------------

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
      .filter((release) => release.assets && release.assets.length && !release.prerelease)
      .map((release) => ({
        tag: release.tag_name,
        date: release.published_at,
        assets: release.assets.map((asset) => ({
          type: asset.content_type,
          name: asset.name,
          url: asset.browser_download_url,
        })),
      }));
  }
}

module.exports = {
  Tool,
};
