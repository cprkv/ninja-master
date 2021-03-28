#!/usr/bin/env node

const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const { dataDirectory } = require("./utils");
const { Tool } = require("./tool");

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
const tools = [ninja, vswhere];

async function handleBuild(argv) {
  console.log(argv);
  console.log("ready!");
}

async function handleInfo() {
  console.log("ninja master environment info:");
  console.log("  data directory:", await dataDirectory());
  for (const tool of tools) {
    console.log(`  awailable ${tool.name} versions:`);
    console.log(await tool.versions());
  }
}

async function handleFetch() {
  for (const tool of tools) {
    console.log(`fetching ${tool.name} versions...`);
    console.log(await tool.fetch());
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

async function main() {
  const parser = yargs(hideBin(process.argv))
    .command({
      command: "build [args..]",
      desc: "run ninja",
      builder: (yargs) => yargs,
      handler: handleBuild,
    })
    .command("info", "environment info", (yargs) => yargs, handleInfo)
    .command("fetch", "updates release cache", (yargs) => yargs, handleFetch)
    .command({
      command: "install [tool] [ver]",
      aliases: ["i"],
      desc: "install ninja release",
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
