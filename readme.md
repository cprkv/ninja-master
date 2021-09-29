Ninja Master
============

more close ninja integration for cmake and windows 

## TODO

- [ ] output cmake toolchain file to use it outside
- [ ] arguments parser for rest arguments
- [ ] cmake integration
- [ ] more error problem matchers
- [ ] test on other vs releases
- [ ] choose x64/x86
- [ ] human-friendly description of the tool
- [X] add simple search for older visual studio products
- [ ] add icons

## installation

*remark*: no installed ninja required - everything works in isolated environment.

```
npm i -g https://github.com/cprkv/ninja-master.git
ninja-master install
```

## build your project

```
cd your-cmake-project
mkdir build
cd build
ninja-master cmake ..
ninja-master build
```

## commands

```
Commands:
  ninja-master cmake [dir]           run cmake generator             [aliases: cm]
  ninja-master build [args..]        run ninja
  ninja-master info                  environment info
  ninja-master fetch                 updates release cache
  ninja-master install [tool] [ver]  install tool                     [aliases: i]
  ninja-master remove [tool]         removes tool                    [aliases: rm]
  ninja-master setvs [ver]           select visual studio release

Options:
  --help     Show help                                                   [boolean]
  --version  Show version number                                         [boolean]
```
