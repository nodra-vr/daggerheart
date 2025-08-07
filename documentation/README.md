# For Publishing Documentation

This directory is an Obsidian vault. Everything in the `./docs` directory will be built by [mkdocs](https://www.mkdocs.org/), then deployed to github pages when the master branch is upated. The automation is handled by [ci.yml](../.github/workflows/ci.yml), and the [mkdocs config](../mkdocs.yml).

# For Documentation Site Theme Development

In order to work on the theme locally, you will need to install several things. These instructions assume you have Python 3 installed, as well as pip. They also assume you have node, and have run `npm install` on the parent directory (the root of the `daggerheart` project).

```
$ pip install mkdocs mkdocs-material mkdocs-roamlinks-plugin mkdocs-rss-plugin
```

Once that is done, you can start up the docs dev server:

```
$ npm run docs
```

This will also start the gulp task which watches and builds the css for the docs site. While it is running, the documentation will be available at [http://localhost:8000](http://localhost:8000).

## But how do I actually edit the theme?

The custom css for the documentation lives in  `./documentation/sass/custom.scss`

Template overrides should be made in the `./documentation/docs/overrides` directory. For details on how to do that, see the [mkdocs-material documentation](https://squidfunk.github.io/mkdocs-material/customization/). You can find the base files you'll be overriding [here](https://github.com/squidfunk/mkdocs-material/tree/master/src/templates).

