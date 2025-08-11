module.exports = {
	// Use tabs instead of spaces
	useTabs: true,
	tabWidth: 2,

	// General formatting
	endOfLine: 'lf',
	printWidth: 120,
	trailingComma: 'es5',

	semi: true,
	singleQuote: true,
	quoteProps: 'as-needed',
	arrowParens: 'avoid',
	bracketSpacing: true,
	bracketSameLine: false,

	// File-specific overrides
	overrides: [
		{
			// JavaScript/ModuleScript files
			files: ['*.js', '*.mjs'],
			options: {
				useTabs: true,
				tabWidth: 2,
				semi: true,
				singleQuote: true,
			},
		},
		{
			// JSON files (system.json, lang files, etc.)
			files: ['*.json'],
			options: {
				useTabs: true,
				tabWidth: 2,
				parser: 'json',
			},
		},
		{
			// CSS files
			files: ['*.css'],
			options: {
				useTabs: true,
				tabWidth: 2,
				parser: 'css',
				singleQuote: true,
			},
		},
		{
			// LESS files
			files: ['*.less'],
			options: {
				useTabs: true,
				tabWidth: 2,
				parser: 'less',
				singleQuote: true,
			},
		},
		{
			// HTML files
			files: ['*.html'],
			options: {
				useTabs: true,
				tabWidth: 2,
				htmlWhitespaceSensitivity: 'ignore',
				bracketSameLine: false,
			},
		},
		{
			// Handlebars templates
			files: ['*.hbs', '*.handlebars'],
			options: {
				useTabs: true,
				tabWidth: 2,
				parser: 'html', // Prettier uses HTML parser for Handlebars
				htmlWhitespaceSensitivity: 'ignore',
				bracketSameLine: true, // Better for Handlebars syntax
			},
		},
		{
			// YAML files (GitHub workflows, Data Models, etc.)
			files: ['*.yml', '*.yaml'],
			options: {
				useTabs: false, // YAML requires spaces
				tabWidth: 2,
				parser: 'yaml',
			},
		},
		{
			// Markdown files
			files: ['*.md'],
			options: {
				useTabs: false, // Spaces work better in Markdown
				tabWidth: 2,
				parser: 'markdown',
				proseWrap: 'preserve',
			},
		},
	],
};
