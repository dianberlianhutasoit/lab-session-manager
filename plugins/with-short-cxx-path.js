const fs = require('fs');
const path = require('path');
const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');

/**
 * Prevents Windows 260-char MAX_PATH Ninja/CMake failures for React Native C++ codegen
 * by using a short staging directory (C:/c on Windows) and capping CMAKE_OBJECT_PATH_MAX.
 */
module.exports = function withShortCxxPath(config) {
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      if (process.platform !== 'win32') return modConfig;
      const cmakeIncludePath = path.join(
        modConfig.modRequest.platformProjectRoot,
        'short-obj-path.cmake'
      );
      fs.writeFileSync(
        cmakeIncludePath,
        'set(CMAKE_OBJECT_PATH_MAX 120 CACHE STRING "Cap object path length on Windows" FORCE)\n',
        'utf8'
      );
      return modConfig;
    },
  ]);

  return withAppBuildGradle(config, (modConfig) => {
    if (process.platform !== 'win32') return modConfig;

    let contents = modConfig.modResults.contents;
    if (contents.includes('short-obj-path.cmake')) {
      return modConfig;
    }

    const cmakeIncludeArg =
      '-DCMAKE_PROJECT_INCLUDE=${rootProject.projectDir.absolutePath.replace("\\\\", "/")}/short-obj-path.cmake';

    // Inject arguments into defaultConfig
    contents = contents.replace(
      /buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL"[^\n]*\n/,
      (match) =>
        `${match}        externalNativeBuild {\n` +
        `            cmake {\n` +
        `                arguments "${cmakeIncludeArg}"\n` +
        `            }\n` +
        `        }\n`
    );

    // Inject externalNativeBuild.cmake inside android { ... }
    contents = contents.replace(
      /androidResources \{[\s\S]*?\n    \}\n\}/,
      (match) =>
        match.replace(
          /\n\}$/,
          `\n    externalNativeBuild {\n` +
            `        cmake {\n` +
            `            version "3.30.5"\n` +
            `            buildStagingDirectory file("C:/c")\n` +
            `        }\n` +
            `    }\n}`
        )
    );

    modConfig.modResults.contents = contents;
    return modConfig;
  });
};
