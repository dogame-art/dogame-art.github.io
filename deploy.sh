#!/usr/bin/env bash
set -eu
PAGES_BRANCH="gh-pages"
SITE_DIR="_output"
_backup_dir="$(mktemp -d)"  # Fixed the asterisks

init() {
  if [[ -z ${GITHUB_ACTION+x} ]]; then
    echo "ERROR: Not allowed to deploy outside of the GitHub Action environment."
    exit 1
  fi
}

build() {
  # clean
  if [[ -d $SITE_DIR ]]; then
    rm -rf "$SITE_DIR"
  fi
  # Run the Ruby script to generate the output
  bundle exec ruby "./scaffold.rb"
  
  # Generate artwork pages AFTER Ruby build
  echo "Generating artwork pages..."
  npm install
  npm run build
}

setup_gh() {
  if [[ -z $(git branch -av | grep "$PAGES_BRANCH") ]]; then
    git checkout -b "$PAGES_BRANCH"
  else
    git checkout "$PAGES_BRANCH"
  fi
}

backup() {
  mv "$SITE_DIR"/* "$_backup_dir"
  mv .git "$_backup_dir"
  if [[ -f CNAME ]]; then
    mv CNAME "$_backup_dir"
  fi
}

flush() {
  rm -rf ./*
  rm -rf .[^.] .??*
  shopt -s dotglob nullglob
  mv "$_backup_dir"/* .
}

deploy() {
  git config --global user.name "ZhgChgLiBot"
  git config --global user.email "no-reply@zhgchg.li"
  git update-ref -d HEAD
  git add -A
  git commit -m "[Automation] Site update No.${GITHUB_RUN_NUMBER}"
  git push -u origin "$PAGES_BRANCH" --force
}

main() {
  init
  build
  setup_gh
  backup
  flush
  deploy
}

main
