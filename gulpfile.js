var istanbul = require('gulp-istanbul'),
    mocha = require('gulp-mocha'),
    gulp = require('gulp');

gulp.task('pre-test', function () {
    return gulp.src(['./sockets/**/**/*.js', './routes/**/**/*.js'])
        // Covering files
        .pipe(istanbul())
        // Force `require` to return covered files
        .pipe(istanbul.hookRequire());
});

gulp.task('test', ['pre-test'], function () {
    return gulp.src(['./test/**/*.js'])
        .pipe(mocha())
        // Creating the reports after tests ran
        .pipe(istanbul.writeReports())
        // Enforce a coverage of at least 50%
        .pipe(istanbul.enforceThresholds({ thresholds: { global: 50 } }));
});