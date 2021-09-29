Ninja Master
============

more close ninja integration for cmake and windows

## TODO

- [x] cmake presets
- [ ] test on other vs releases
- [ ] choose x64/x86
- [ ] human-friendly description of the tool
- [X] add simple search for older visual studio products

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

> hint: you can edit preset yourself as you wish, but do not touch `configurePresets[ninja-base]` object, please ^_^. if you run `ninja-master preset` it will try to change only that object, nothing else!

## commands

```
Команды:
  ninja-master build [args..]        run ninja                           [алиасы: b]
  ninja-master info                  environment info
  ninja-master fetch                 updates release cache
  ninja-master preset                dump cmake preset for ninja/fix current preset 
                                     to use with ninja                   [алиасы: p]
  ninja-master install [tool] [ver]  install tool                        [алиасы: i]
  ninja-master remove [tool]         removes tool                       [алиасы: rm]
  ninja-master setvs [ver]           select visual studio release
  ninja-master any <cmd>             run any command from dev cmd        [алиасы: a]
  ninja-master cmake <dir>           run cmake generation from dev cmd for directory
                                     <dir>                              [алиасы: cm]

Опции:
  --help     Показать помощь                                           [булевый тип]
  --version  Показать номер версии                                     [булевый тип]
```
