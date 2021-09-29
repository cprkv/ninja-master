const { jsonFileAbstract, hasFile } = require("./utils");
const { ninja, vcpkg } = require("./tool");
const { getVS } = require("./vs");

async function getBaseConfigurePresetWithEnv() {
  const vs = await getVS();
  const environment = await vs.getEnvironment();
  const CMAKE_MAKE_PROGRAM = await ninja.installedPath();
  const CMAKE_TOOLCHAIN_FILE = await vcpkg.toolchainPath();

  if (!(await hasFile(CMAKE_MAKE_PROGRAM))) {
    throw `error: ${CMAKE_MAKE_PROGRAM} not found`;
  }
  if (!(await hasFile(CMAKE_TOOLCHAIN_FILE))) {
    throw `error: ${CMAKE_MAKE_PROGRAM} not found`;
  }

  return {
    name: "ninja-base",
    generator: "Ninja",
    hidden: true,
    environment,
    cacheVariables: { CMAKE_MAKE_PROGRAM, CMAKE_TOOLCHAIN_FILE },
  };
}

async function updatePreset(configurePreset, presetFileName) {
  const presetContents = await jsonFileAbstract.read(presetFileName);

  if (!presetContents.configurePresets) {
    presetContents.configurePresets = [];
  }

  const ninjaBase = presetContents.configurePresets.find(
    (x) => x.name === "ninja-base"
  );
  if (ninjaBase) {
    Object.assign(ninjaBase, configurePreset);
  } else {
    presetContents.configurePresets.push(configurePreset);
  }

  await jsonFileAbstract.write(presetFileName, presetContents, true);
}

async function writeDefaultPreset(configurePreset, presetFileName) {
  const presetContents = {
    version: 3,
    cmakeMinimumRequired: { major: 3, minor: 20, patch: 0 },
    configurePresets: [
      {
        name: "ninja",
        inherits: [configurePreset.name],
        binaryDir: "${sourceDir}/.vscode/build",
        cacheVariables: {},
      },
      configurePreset,
    ],
    buildPresets: [
      {
        name: "ninja",
        configurePreset: "ninja",
        inheritConfigureEnvironment: true,
        targets: [],
      },
    ],
  };
  await jsonFileAbstract.write(presetFileName, presetContents, true);
}

async function createDefaultOrUpdateCmakePreset(
  presetFileName = "CMakeUserPresets.json"
) {
  const configurePreset = await getBaseConfigurePresetWithEnv();
  if (await hasFile(presetFileName)) {
    await updatePreset(configurePreset, presetFileName);
  } else {
    await writeDefaultPreset(configurePreset, presetFileName);
  }
}

module.exports = {
  createDefaultOrUpdateCmakePreset,
};
