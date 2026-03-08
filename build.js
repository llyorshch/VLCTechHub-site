const path = require('path')
const Metalsmith = require('metalsmith')
const markdown = require('metalsmith-markdown')
const layouts = require('metalsmith-layouts')
const permalinks = require('@metalsmith/permalinks')
const inplace = require('metalsmith-in-place')
const sass = require('sass')
const nunjucksDate = require('nunjucks-moment-timezone-filter')
const git = require('git-rev-sync')

const version = git.short()

function compileSass(options = {}) {
  const { outputDir = '' } = options
  return function (files, metalsmith, done) {
    const source = metalsmith.source()
    const scssFiles = Object.keys(files).filter(
      (f) => f.endsWith('.scss') && !path.basename(f).startsWith('_')
    )
    try {
      scssFiles.forEach((filename) => {
        const fullPath = path.join(source, filename)
        const result = sass.compile(fullPath, { silenceDeprecations: ['import', 'slash-div'] })
        const cssFilename = outputDir
          ? path.join(outputDir, path.basename(filename).replace(/\.scss$/, '.css'))
          : filename.replace(/\.scss$/, '.css')
        files[cssFilename] = { contents: Buffer.from(result.css) }
        delete files[filename]
      })
      // Remove partial scss files
      Object.keys(files)
        .filter((f) => f.endsWith('.scss'))
        .forEach((f) => delete files[f])
      done()
    } catch (err) {
      done(err)
    }
  }
}

Metalsmith(__dirname)
  .metadata({
    seo: {
      ogTitle: 'VLCTechHub',
      ogDescription:
        'VLCTechHub es una asociación que promueve las comunidades técnicas de la ciudad de Valencia y alrededores, fomenta empleos de calidad y (co)organiza eventos para ayudar a mejorar la diversidad, la cooperación y hacer que el conocimiento tecnológico sea accesible para más personas.',
      ogUrl: 'https://vlctechhub.org/',
    },
    version: version,
  })
  .source('./data')
  .destination('./dist')
  .clean(true)
  .use(markdown())
  .use(
    inplace({
      engineOptions: {
        filters: { date: nunjucksDate.dateFilter, newDate: nunjucksDate.newDate },
      },
    })
  )
  .use(
    layouts({
      engineOptions: {
        filters: { date: nunjucksDate.dateFilter, newDate: nunjucksDate.newDate },
      },
      directory: 'templates/',
    })
  )
  .use(permalinks({}))
  .use(
    compileSass({
      outputDir: 'assets/css/',
    })
  )
  .use((files, metalsmith, done) => {
    //fingerprint css based on commit
    files[`assets/css/vlctechhub-${version}-min.css`] = files['assets/css/main.css']
    done()
  })
  .build(function (err) {
    if (err) {
      throw err
    }
  })
