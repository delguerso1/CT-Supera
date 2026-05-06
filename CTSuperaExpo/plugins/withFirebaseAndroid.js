const {
  withProjectBuildGradle,
  withAppBuildGradle,
} = require('expo/config-plugins');

/**
 * Firebase no Android (Expo prebuild = Groovy):
 * - Raiz: classpath `com.google.gms:google-services:4.4.4` (o Expo já injeta uma versão;
 *   fixamos 4.4.4 sem usar `plugins { }` na raiz, para evitar conflitos com o template RN).
 * - App: BoM + Analytics; `apply plugin: google-services` no **fim** (depois do plugin Android),
 *   como o próprio Expo faz — não usar `plugins { google-services }` **antes** de
 *   `com.android.application` (isso falhou no EAS com erro Gradle).
 */
function withFirebaseAndroid(config) {
  config = withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      return mod;
    }
    let { contents } = mod.modResults;

    contents = contents.replace(
      /plugins\s*\{\s*\r?\n\s*id\s+['"]com\.google\.gms\.google-services['"]\s+version\s+['"][^'"]+['"]\s+apply\s+false\s*\r?\n\s*\}\s*\r?\n?/,
      '',
    );

    if (/classpath\s+['"]com\.google\.gms:google-services:[^'"]+['"]/.test(contents)) {
      contents = contents.replace(
        /classpath\s+['"]com\.google\.gms:google-services:[^'"]+['"]/,
        "classpath 'com.google.gms:google-services:4.4.4'",
      );
    } else {
      contents = contents.replace(
        /dependencies\s*\{/,
        `dependencies {
        classpath 'com.google.gms:google-services:4.4.4'`,
      );
    }

    mod.modResults.contents = contents;
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      return mod;
    }
    let { contents } = mod.modResults;

    contents = contents.replace(
      /plugins\s*\{\s*\r?\n\s*id\s+['"]com\.google\.gms\.google-services['"]\s*\r?\n\s*\}\s*\r?\n?/,
      '',
    );

    if (!/apply\s+plugin:\s*['"]com\.google\.gms\.google-services['"]/.test(contents)) {
      contents = `${contents.trimEnd()}\n\napply plugin: 'com.google.gms.google-services'\n`;
    }

    if (!contents.includes('com.google.firebase:firebase-bom')) {
      contents = contents.replace(
        /dependencies\s*\{/,
        `dependencies {
    implementation platform('com.google.firebase:firebase-bom:34.12.0')
    implementation 'com.google.firebase:firebase-analytics'`,
      );
    }

    mod.modResults.contents = contents;
    return mod;
  });

  return config;
}

module.exports = withFirebaseAndroid;
