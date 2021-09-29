#!/usr/bin/env node

const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
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
  const comand = argv.cmd;
  console.log(`running ${comand}`);
  const vs = await getVS();
  await vs.runInDevCmd(comand, {
    matchOut: console.log,
    matchErr: console.log,
  });
  console.log("ready!");
}

async function handleVcpkg(argv) {
  const vcpkgArguments = argv.cmd;
  const vcpkgPath = await vcpkg.installedPath();
  console.log(`running vcpkg ${vcpkgArguments}`);

  // const vs = await getVS();
  // await vs.runInDevCmd(`\"${vcpkgPath}\" ${vcpkgArguments}`, {
  //   matchOut: console.log,
  //   matchErr: console.log,
  // });

  await executeBatFile(vcpkgPath, vcpkgArguments, {
    matchOut: console.log,
    matchErr: console.log,
  });
  console.log("ready!");
}

async function handleCmakePresets() {
  const vs = await getVS();
  const env = await vs.getEnvironment();
  const CMAKE_MAKE_PROGRAM = await ninja.installedPath();
  const presetFileName = "CMakeUserPresets.json";
  await createDefaultOrUpdateCmakePreset(
    env,
    CMAKE_MAKE_PROGRAM,
    presetFileName
  );
  console.log("ready!");
}

async function handleCmake(argv) {
  const CMAKE_MAKE_PROGRAM = await ninja.installedPath();
  const comand = `cmake -DCMAKE_MAKE_PROGRAM="${CMAKE_MAKE_PROGRAM}" -GNinja ${argv.dir}`;
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

async function main() {
  const parser = yargs(hideBin(process.argv))
    .command({
      command: "build [args..]",
      aliases: ["b"],
      desc: "run ninja",
      builder: (yargs) => yargs,
      handler: handleBuild,
    })
    .command("info", "environment info", (yargs) => yargs, handleInfo)
    .command("fetch", "updates release cache", (yargs) => yargs, handleFetch)
    .command({
      command: "preset",
      aliases: "p",
      desc: "dump cmake preset for ninja/fix current preset to use with ninja",
      builder: (yargs) => yargs,
      handler: handleCmakePresets,
    })
    .command({
      command: "install [tool] [ver]",
      aliases: ["i"],
      desc: "install tool",
      builder: (yargs) =>
        yargs
          .positional("tool", {
            describe: "tool name, if empty installs all",
            choices: tools.map((x) => x.name),
            type: "string",
          })
          .positional("ver", {
            describe:
              "version tag (run info command to get available versions). if empty, latest choosen",
            type: "string",
          }),
      handler: handleInstall,
    })
    .command({
      command: "remove [tool]",
      aliases: ["rm"],
      desc: "removes tool",
      builder: (yargs) =>
        yargs.positional("tool", {
          describe: "tool name, if empty removes all",
          choices: tools.map((x) => x.name),
          type: "string",
        }),
      handler: handleRemove,
    })
    .command({
      command: "setvs [ver]",
      desc: "select visual studio release",
      builder: (yargs) =>
        yargs.positional("ver", {
          describe: "visual studio name, if empty just prints all available",
          type: "string",
        }),
      handler: handleSetVS,
    })
    .command({
      command: "any <cmd>",
      aliases: ["a"],
      desc: "run any command from dev cmd",
      builder: (yargs) => yargs,
      handler: handleAny,
    })
    .command({
      command: "vcpkg <cmd>",
      aliases: ["pkg"],
      desc: "run vcpkg command from dev cmd",
      builder: (yargs) => yargs,
      handler: handleVcpkg,
    })
    .command({
      command: "cmake <dir>",
      aliases: ["cm"],
      desc: "run cmake generation from dev cmd for directory <dir>",
      builder: (yargs) => yargs,
      handler: handleCmake,
    })
    .demandCommand()
    .strict()
    .fail((msg, err, args) => {
      if (msg) {
        console.error("(ERROR)", msg);
        parser.showHelp();
      } else if (err) {
        console.error("(ERROR)", err);
      } else {  
        console.error("(ERROR)", "wtf?");
      }
    });

  await parser.parse();
}

main().catch((err) => console.error(err));
