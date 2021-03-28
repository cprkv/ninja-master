const path = require("path");
const moment = require("moment");
const {
  stat,
  dataDirectory,
  jsonFile,
  remove,
  downloadFile,
  createTmpFile,
  extractToDataDirectory,
} = require("./utils");

const ninjaReleaseCache = {
  write: (obj) => jsonFile.write("ninja-releases.json", obj),
  read: () => jsonFile.read("ninja-releases.json"),
};

const installedNinjaCache = {
  write: (obj) => jsonFile.write("ninja-installed.json", obj),
  read: () => jsonFile.read("ninja-installed.json"),
};

async function fetchNinjaVersions() {
  const res = await superagent
    .get(`https://api.github.com/repos/ninja-build/ninja/releases`)
    .set("User-Agent", "ninja-master")
    .set("Accept", "application/json");
  await ninjaReleaseCache.write(res.body);
}

async function readAndProcessReleases() {
  let releases;
  try {
    releases = await ninjaReleaseCache.read();
  } catch (_) {
    console.log("error read ninja releases cache, fetching...");
    await fetchNinjaVersions();
    releases = await ninjaReleaseCache.read();
  }
  return releases
    .filter((release) => release.assets && release.assets.length)
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

async function formatAwailableNinjaVersions() {
  let installed;
  try {
    installed = await installedNinjaCache.read();
  } catch (_) {}

  const formatNinjaReleases = (releases) => {
    const str = [];
    for (const release of releases) {
      const mark = release.tag == installed ? "X" : " ";
      const date = moment(release.date).format("D MMMM YYYY");
      str.push(`   ${mark} ${release.tag}\t${date}`);
    }
    return str.join("\n");
  };

  const releases = await readAndProcessReleases();
  return formatNinjaReleases(releases);
}

async function installNinja(version) {
  let installed;
  try {
    installed = await installedNinjaCache.read();
  } catch (_) {}

  if (version) {
    if (installed && installed == version) {
      console.log(`version ${version} already installed!`);
      return;
    }
  }

  const releases = await readAndProcessReleases();
  const release = version
    ? releases.find((r) => r.tag == version)
    : releases[0];

  if (!release) {
    console.log(
      `error: there's no ninja release ${version}, available releases:`
    );
    console.log(await formatAwailableNinjaVersions());
    return;
  } else if (!version && installed && installed == release.tag) {
    console.log(`version ${installed} already installed!`);
    return;
  }

  if (!version) {
    console.log(`latest ninja release: ${release.tag}`);
  }

  const winReleases = release.assets.filter((ass) =>
    ass.name.match(/win\.zip/g)
  );
  if (winReleases.length != 1) {
    console.log("something went wrong... windows asset not found.");
    console.log(
      "available assets: " + release.assets.map((ass) => ass.name).join(", ")
    );
    console.log(
      "found assets: " + winReleases.map((ass) => ass.name).join(", ")
    );
  }

  const releaseUrl = winReleases[0].url;
  console.log(`downloading ${releaseUrl}...`);
  const tmpFilePath = await createTmpFile(".zip");
  await downloadFile(releaseUrl, tmpFilePath);
  console.log(`temporary file downloaded to ${tmpFilePath}`);
  await extractToDataDirectory(tmpFilePath);
  const newNinjaPath = path.join(await dataDirectory(), "ninja.exe");

  try {
    await stat(newNinjaPath);
  } catch (_) {
    console.log(
      `can't stat ${newNinjaPath}, probably some error while downloading...`
    );
    return;
  }

  console.log(`ninja installed to ${newNinjaPath}`);
  await installedNinjaCache.write(release.tag);
}

async function removeNinja() {
  let installed;
  try {
    installed = await installedNinjaCache.read();
  } catch (_) {}

  if (!installed) {
    console.log("no ninja versions is currently installed!");
    return;
  }

  const ninjaPath = path.join(await dataDirectory(), "ninja.exe");
  await remove(ninjaPath);
  await installedNinjaCache.write("");
}

module.exports = {
  formatAwailableNinjaVersions,
  fetchNinjaVersions,
  installNinja,
  removeNinja,
};
