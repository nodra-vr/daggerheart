const fs = require('fs-extra');
const path = require('path');
const gulp = require('gulp');
const shell = require('gulp-shell');
const sass = require('gulp-sass')(require('sass'));

const mergeStream = require('merge-stream');

const PACK_SRC = `./data`;
const PACK_DEST = `./packs`;

/* ----------------------------------------- */
/*  Compile sass
/* ----------------------------------------- */

const SIMPLE_SASS = ["styles/**/*.scss"];
function compileSass() {
  return gulp.src('./styles/simple.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest('./styles'));
};

/* ----------------------------------------- */
/*  Watch Updates
/* ----------------------------------------- */

function watchUpdates() {
  gulp.watch(SIMPLE_SASS, compileSass);
}

/* ----------------------------------------- */
/*  Compile and Extract packs to yaml
/* ----------------------------------------- */

function compilePacks() {
  // Every folder in the src dir will become a compendium.
  const folders = fs.readdirSync(PACK_SRC).filter((file) => {
    return fs.statSync(path.join(PACK_SRC, file)).isDirectory();
  });

  const packs = folders.map((folder) => {
    console.log(folder);
    return gulp.src(path.join(PACK_SRC, folder))
      .pipe(shell([
        `fvtt package --id daggerheart --type System pack <%= file.stem %> -c --yaml --in "<%= file.path %>" --out ${PACK_DEST}`
      ]))
  })

  return mergeStream.call(null, packs);
}

function extractPacks() {
  // Start a stream for all db files in the packs dir.
  const packs = gulp.src(`${PACK_DEST}/*`)
    .pipe(shell([
      `fvtt package --id daggerheart --type System unpack <%= file.stem %> -c --yaml --in ${PACK_DEST} --out ${PACK_SRC}/<%= file.stem %>`
    ]));

  // Call the streams.
  return mergeStream.call(null, packs);
}

/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

module.exports = {
  default: gulp.series(
    gulp.parallel(compileSass),
    watchUpdates
  ),
  css: compileSass,
  pack: compilePacks,
  unpack: extractPacks,
}