

# reset db
reset_db:
	# close all running containers, remove all the persistent data
	docker compose -f local.docker-compose.yml down -v

	# up db container
	docker compose -f local.docker-compose.yml up -d


# you need to run "pip install black"
format:
	# run black formatter
	black .


# you need to run "pip install flake8 black" before running this command
lint:
	# run linter
	flake8 --exclude venv,tests --ignore=E501,F401,W292,E261,W503,W504,E302,F541,E303,E712,E711,E203,W291
	# run format checking
	black . --check --verbose --diff --color


# you need to run "pip install bandit" before running this command
security:
	# run bandit security check
	bandit --exclude "./venv,tests" --skip B311 -r .


# you need to run "pip install pytest" before running this command
test:
	# run tests
	pytest -v


deploy:
	docker compose up -d --build
	docker image prune -f

prepush: lint test security


