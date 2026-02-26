precommit:
	npx prettier --write --tab-width 4 --print-width 5000 "**/*.html" "**/*.js"

squash:
	git checkout --orphan temp
	git add -A
	git commit -m "init"
	git branch -D main
	git branch -m main
	git push -f origin main
