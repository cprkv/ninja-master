Ninja Master
============

more close ninja integration for cmake and windows 

## TODO
- [ ] cmake integration
- [ ] more error problem matchers
- [ ] test on other vs releases
- [ ] choose x64/x86
- [ ] more human-friendly description of the tool
- [ ] add simple search for older visual studio products

## installation

```
npm i -g https://github.com/cprkv/ninja-master.git
ninja-master install
```

## build your project

**TODO (not works yet)**
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
