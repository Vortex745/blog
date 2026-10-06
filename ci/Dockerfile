# syntax=docker/dockerfile:1
# Use the same Debian/Node environment as the blog, with a Docker CLI and Buildx.
FROM docker:29-cli AS docker-cli
FROM node:22-bookworm
COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker-cli /usr/local/libexec/docker/cli-plugins/ /usr/local/libexec/docker/cli-plugins/
