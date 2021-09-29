#!/usr/bin/env node

const { dataDirectory, executeBatFile } = require("./utils");
const { tools, ninja, vcpkg } = require("./tool");
const { getVS } = require("./vs");
const { createDefaultOrUpdateCmakePreset } = require("./cmake-preset");
const which = require("which");

async function handleBuild(argv) {
  const commandLine = [await ninja.installedPath()];
  if (argv.args) {
    for (const arg of argv.args) {
      commandLine.push(arg);
    }
  }
  const comand = commandLine.join(" ");
  console.log(`running ${comand}`);
  const vs = await getVS();
  await vs.runInDevCmd(comand, vs.ninjaMatcher());
  console.log("ready!");
}

async function handleAny(argv) {
  const comand = argv.cmd.join(" ");
  console.log(`running ${comand}`);
  const vs = await getVS();
  await vs.runInDevCmd(comand, {
    matchOut: console.log,
    matchErr: console.log,
  });
  console.log("ready!");
}

async function handleVcpkg(argv) {
  const vcpkgArguments = argv.cmd.join(" ");
  const vcpkgPath = await vcpkg.installedPath();
  // const vs = await getVS();
  // await vs.runInDevCmd(`\"${vcpkgPath}\" ${vcpkgArguments}`, {
  //   matchOut: console.log,
  //   matchErr: console.log,
  // });
  try {
    await executeBatFile(vcpkgPath, vcpkgArguments, {
      matchOut: console.log,
      matchErr: console.log,
    });
  } catch {}
  console.log("ready!");
}

async function handleCmakePresets() {
  await createDefaultOrUpdateCmakePreset();
  console.log("ready!");
}

async function handleCmake(argv) {
  const cmakeArguments = argv.cmd.join(" ");
  const CMAKE_MAKE_PROGRAM = await ninja.installedPath();
  const CMAKE_TOOLCHAIN_FILE = await vcpkg.toolchainPath();
  const comand = `cmake -DCMAKE_MAKE_PROGRAM="${CMAKE_MAKE_PROGRAM}" -DCMAKE_TOOLCHAIN_FILE="${CMAKE_TOOLCHAIN_FILE}" -GNinja ${cmakeArguments}`;
  console.log(`running ${comand}`);
  const vs = await getVS();
  await vs.runInDevCmd(comand, vs.ninjaMatcher());
  console.log("ready!");
}

async function handleInfo() {
  console.log("ninja master environment info:");
  console.log();
  console.log(`  data directory:\n    ${await dataDirectory()}`);
  console.log();
  for (const tool of tools) {
    console.log(`  awailable ${tool.name} versions:`);
    console.log(await tool.versions());
    console.log();
  }
  const vs = await getVS();
  console.log("  visual studio products:");
  console.log(await vs.getProducts());
  console.log();
  console.log(`  current dev cmd path:\n    ${await vs._getDevCmd()}`);
  console.log();
}

async function handleFetch() {
  for (const tool of tools) {
    console.log(`fetching ${tool.name} versions...`);
    await tool.fetch();
  }
  console.log("done");
}

async function handleInstall(args) {
  if (!args.tool) {
    console.log(`installing latest versions for all tools...`);
    for (const tool of tools) {
      await tool.install();
    }
  } else {
    const tool = tools.find((x) => x.name == args.tool);
    if (!tool) {
      throw `tool by name ${args.tool} not found`;
    }
    if (!args.ver) {
      console.log(`installing latest ${tool.name} release...`);
    } else {
      console.log(`installing ${tool.name} release ${args.ver}...`);
    }
    await tool.install(args.ver);
  }
  console.log("done");
}

async function handleRemove(args) {
  if (!args.tool) {
    console.log(`removes all tools...`);
    for (const tool of tools) {
      await tool.remove();
    }
  } else {
    const tool = tools.find((x) => x.name == args.tool);
    if (!tool) {
      throw `tool by name ${args.tool} not found`;
    }
    await tool.remove();
  }
  console.log("done");
}

async function handleSetVS(args) {
  const vs = await getVS();
  if (!args.ver) {
    const producs = await vs.getProducts();
    console.log("  visual studio products:");
    console.log(producs);
  } else {
    await vs.setVS(args.ver);
  }
  console.log("done");
}

function showHelp() {
  console.log(
    "ninja-master usage:\n" +
      "\n" +
      "  ninja-master build [args..]        run ninja with arguments\n" +
      "    aliases: b\n" +
      "\n" +
      "  ninja-master info                  environment info\n" +
      "  ninja-master fetch                 updates release cache\n" +
      "\n" +
      "  ninja-master install [tool] [ver]  install tool\n" +
      "    aliases: i\n" +
      "      [tool]   - tool name, if empty installs all\n" +
      "      [ver]    - version tag (run `info` command to get available versions). if empty, latest choosen\n" +
      "\n" +
      "  ninja-master remove [tool]         remove tool\n" +
      "    aliases: rm\n" +
      "      [tool]   - tool name, if empty removes all\n" +
      "\n" +
      "  ninja-master setvs [ver]           select visual studio release\n" +
      "      [ver]    - visual studio name, if empty just prints all available\n" +
      "\n" +
      "  ninja-master any <cmd..>           run any command from dev cmd\n" +
      "\n" +
      "  ninja-master preset                dump cmake preset for ninja/fix current preset to use with ninja\n" +
      "    aliases: p\n" +
      "\n" +
      "  ninja-master vcpkg <args..>        run vcpkg command from dev cmd args with args\n" +
      "    aliases: pkg\n" +
      "\n" +
      "  ninja-master cmake <args..>        run cmake from dev cmd with args\n" +
      "    aliases: cm\n" +
      "\n"
  );
  process.exit(1);
}

function getArgument(index) {
  if (2 + index >= process.argv.length) {
    console.log("invalid usage");
    showHelp();
  }
  return process.argv[2 + index];
}

function getOptArgument(index) {
  if (2 + index >= process.argv.length) {
    return null;
  }
  return process.argv[2 + index];
}

function getRestArguments(index) {
  if (2 + index >= process.argv.length) {
    console.log("invalid usage");
    showHelp();
  }
  return process.argv.slice(2 + index);
}

function getOptRestArguments(index) {
  if (2 + index >= process.argv.length) {
    return [];
  }
  return process.argv.slice(2 + index);
}

async function mainMyArgs() {
  switch (getArgument(0)) {
    case "build":
    case "b":
      return handleBuild({ args: getOptRestArguments(1) });

    case "info":
      return handleInfo();

    case "fetch":
      return handleFetch();

    case "install":
    case "i":
      return await handleInstall({
        tool: getOptArgument(1),
        ver: getOptArgument(2),
      });

    case "remove":
    case "rm":
      return await handleRemove({ tool: getOptArgument(1) });

    case "setvs":
      return await handleSetVS({ ver: getOptArgument(1) });

    case "any":
      return await handleAny({ cmd: getRestArguments(1) });

    case "vcpkg":
    case "pkg":
      return await handleVcpkg({ cmd: getRestArguments(1) });

    case "cmake":
    case "cm":
      return await handleCmake({ cmd: getRestArguments(1) });

    case "preset":
    case "p":
      return await handleCmakePresets();

    case "help":
      showHelp();

    default:
      console.log("unknown command");
      showHelp();
  }
}

mainMyArgs().catch((err) => console.error(err));
