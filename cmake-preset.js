const { jsonFileAbstract, hasFile } = require("./utils");

const ninjaBaseConfigurePreset = {
  name: "ninja-base",
  generator: "Ninja",
  hidden: true,
};

function getBaseConfigurePresetWithEnv(environment, CMAKE_MAKE_PROGRAM) {
  return Object.assign({}, ninjaBaseConfigurePreset, {
    environment,
    cacheVariables: { CMAKE_MAKE_PROGRAM },
  });
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
  environment,
  CMAKE_MAKE_PROGRAM,
  presetFileName = "CMakeUserPresets.json"
) {
  const configurePreset = getBaseConfigurePresetWithEnv(
    environment,
    CMAKE_MAKE_PROGRAM
  );
  if (await hasFile(presetFileName)) {
    await updatePreset(configurePreset, presetFileName);
  } else {
    await writeDefaultPreset(configurePreset, presetFileName);
  }
}

module.exports = {
  createDefaultOrUpdateCmakePreset,
};
