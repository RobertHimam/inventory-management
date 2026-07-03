.PHONY: help install build test test-coverage lint lint-fix format format-check type-check \
	up down build-images logs logs-% restart-% ps seed seed-mongo seed-catalog clean

help:
	@echo "Targets:"
	@echo "  install         pnpm install"
	@echo "  build           build all workspace packages"
	@echo "  test            run jest test suite"
	@echo "  test-coverage   run jest with coverage"
	@echo "  lint / lint-fix lint all workspaces"
	@echo "  format / format-check  prettier"
	@echo "  type-check      tsc --noEmit across workspaces"
	@echo "  up / down       docker-compose up -d / down"
	@echo "  build-images    docker-compose build"
	@echo "  logs            tail all container logs"
	@echo "  logs-<service>  tail one service, e.g. make logs-gateway"
	@echo "  restart-<service>  restart one service"
	@echo "  ps              docker-compose ps"
	@echo "  seed            seed dev users via gateway"
	@echo "  seed-mongo      seed mongo directly"
	@echo "  clean           remove node_modules, coverage, dist"

install:
	pnpm install

build:
	pnpm build

test:
	pnpm test

test-coverage:
	pnpm test:coverage

lint:
	pnpm lint

lint-fix:
	pnpm lint:fix

format:
	pnpm format

format-check:
	pnpm format:check

type-check:
	pnpm type-check

up:
	docker-compose up -d

down:
	docker-compose down

build-images:
	docker-compose build

logs:
	docker-compose logs -f

logs-%:
	docker-compose logs -f $*

restart-%:
	docker-compose restart $*

ps:
	docker-compose ps

seed:
	pnpm seed

seed-mongo:
	pnpm seed:mongo

seed-catalog:
	pnpm seed:catalog

clean:
	rm -rf node_modules coverage
	find apps packages -maxdepth 2 -type d \( -name dist -o -name node_modules \) -exec rm -rf {} +
