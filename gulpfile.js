const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));

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
/*  Export Tasks
/* ----------------------------------------- */

module.exports = {
  default: gulp.series(
    gulp.parallel(compileSass),
    watchUpdates
  ),
  css: compileSass
}