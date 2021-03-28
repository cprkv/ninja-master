#!/usr/bin/env node

const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const { dataDirectory } = require("./utils");
const {
  formatAwailableNinjaVersions,
  fetchNinjaVersions,
  installNinja,
  removeNinja,
} = require("./ninja");

async function handleBuild(argv) {
  console.log(argv);
  console.log("ready!");
}

async function handleInfo() {
  console.log("ninja master environment info:");
  console.log("  data directory:", await dataDirectory());
  console.log("  awailable ninja versions:");
  console.log(await formatAwailableNinjaVersions());
}

async function handleFetch() {
  console.log("fetching ninja versions...");
  await fetchNinjaVersions();
  console.log("done");
}

async function handleInstall(args) {
  if (!args.ver) {
    console.log(`installing latest ninja release...`);
  } else {
    console.log(`installing release ${args.ver}...`);
  }
  await installNinja(args.ver);
  console.log("done");
}

async function handleRemove() {
  await removeNinja();
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
    .command(
      "fetch",
      "updates ninja release cache",
      (yargs) => yargs,
      handleFetch
    )
    .command({
      command: "install [ver]",
      aliases: ["i"],
      desc: "install ninja release",
      builder: (yargs) =>
        yargs.positional("ver", {
          describe: "version tag (run info command to get available versions)",
          type: "string",
        }),
      handler: handleInstall,
    })
    .command("remove", "removes ninja", (yargs) => yargs, handleRemove)
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
