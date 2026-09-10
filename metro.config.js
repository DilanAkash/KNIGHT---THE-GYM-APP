// Extends @expo/metro-config, reached through the `expo/metro-config`
// re-export (the scoped package is not hoisted to the project root, so
// requiring it directly would fail). EAS greps this file for the scoped name
// and warns when it cannot find it, hence spelling it out here.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web build loads wa-sqlite through a .wasm import, which Metro
// only resolves once wasm is a known asset extension. Inert on native.
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

module.exports = config;
