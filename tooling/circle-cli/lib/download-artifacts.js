'use strict';

const _ = require(`lodash`);
const fs = require(`fs`);
const mkdirp = require(`mkdirp`);
const path = require(`path`);
const required = require(`./required`);
const request = require(`request`);

module.exports = _.curry((argv, ci, build) => {
  required(build, `build_num`);
  required(build, `project`);
  required(build, `username`);

  return ci.getBuildArtifacts(build)
    .then((artifacts) => {
      return artifacts.reduce((promise, artifact) => {
        return promise.then(() => downloadArtifact(artifact));
      }, Promise.resolve());
    });
});

const xunit = /^.*?circle-junit.+?\//;
function downloadArtifact(artifact) {
  return new Promise((resolve, reject) => {
    let filename;
    console.log(artifact)
    if (artifact.path.indexOf(`lcov.info`) === -1) {
      filename = `${artifact.path.replace(xunit, `reports/`)}`;
    }
    else {
      filename = `reports/lcov-${artifact.node_index}.info`;
    }
    mkdirp.sync(path.dirname(filename));
    console.log(artifact.path);
    console.log(`fetching artifact ${artifact.pretty_path} to ${filename}`);
    // For reasons I can't explain, the pipe/writeStream pattern exits after
    // saving the first file.
    request(artifact.url, (err, res) => {
      if (err) {
        reject(err);
        return;
      }

      fs.writeFile(filename, res.body, (err2) => {
        if (err2) {
          reject(err2);
          return;
        }

        resolve();
      });
    });
  });
}
