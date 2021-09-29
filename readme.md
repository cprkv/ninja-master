# Ninja Master

more close ninja integration for cmake, windows and vcpkg!

## TODO

- [x] vcpkg
- [x] cmake presets
- [ ] test on other vs releases
- [ ] choose x64/x86
- [ ] human-friendly description of the tool
- [x] add simple search for older visual studio products

## installation

> hint: no installed ninja required - everything works in isolated environment.

```
npm i -g https://github.com/cprkv/ninja-master.git
ninja-master install
```

## build your project

### integrated builder

```bash
cd your-cmake-project
mkdir build
cd build
ninja-master cmake .. # runs "cmake .." in special ninja environment
ninja-master build # runs "cmake --build ." in special ninja environment
```

> hint: if you change visual studio version using `ninja-master setvs` command, you need to delete cache, or use another folder!

### cmake builder

```bash
cd your-cmake-project
ninja-master preset # generates/updates CMakeUserPresets.json
# ... please edit this preset yourself :)
cmake --preset ninja
cmake --build --preset ninja
```

> hint: if you change visual studio version using `ninja-master setvs` command, you need to rerun command `ninja-master preset` to update preset and clean cmake cache!

> hint: you can edit preset yourself as you wish, but do not touch `configurePresets[ninja-base]` object, please ^\_^. if you run `ninja-master preset` it will try to change only that object, nothing else!

## commands

```
ninja-master build [args..]        run ninja with arguments
  aliases: b

ninja-master info                  environment info
ninja-master fetch                 updates release cache

ninja-master install [tool] [ver]  install tool
  aliases: i
    [tool]   - tool name, if empty installs all
    [ver]    - version tag (run `info` command to get available versions). if empty, latest choosen

ninja-master remove [tool]         remove tool
  aliases: rm
    [tool]   - tool name, if empty removes all

ninja-master setvs [ver]           select visual studio release
    [ver]    - visual studio name, if empty just prints all available

ninja-master any <cmd..>           run any command from dev cmd

ninja-master preset                dump cmake preset for ninja/fix current preset to use with ninja
  aliases: p

ninja-master vcpkg <args..>        run vcpkg command from dev cmd args with args
  aliases: pkg

ninja-master cmake <args..>        run cmake from dev cmd with args
  aliases: cm
```
