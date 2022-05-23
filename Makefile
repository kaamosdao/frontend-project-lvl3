install:
	npm install
dev:
	npx cross-env NODE_ENV=development webpack --mode development
build:
	npx cross-env NODE_ENV=production webpack --mode production
serve:
	npx cross-env NODE_ENV=development webpack serve --mode development --open
lint:
	npx eslint .
push:
	git add .
	git commit -m "$(ARGS)"
	git push
