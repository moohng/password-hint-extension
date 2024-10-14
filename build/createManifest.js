const fs = require('fs');
const manifest = require('../public/manifest.json');
const { version } = require('../package.json');

function createManifestPlugin() {
  return {
    buildEnd: () => {
      manifest.version = version;
      if (!fs.existsSync('dist/output')) {
        fs.mkdirSync('dist/output', { recursive: true });
      }
      fs.writeFileSync('dist/output/manifest.json', JSON.stringify(manifest));
    },
  };
}

module.exports = createManifestPlugin;
