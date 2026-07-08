ARG BASE_IMAGE
FROM ${BASE_IMAGE}

COPY --chown=$MAMBA_USER:$MAMBA_USER environment.yml /tmp/environment.yml
RUN micromamba install -y -n base -f /tmp/environment.yml && \
    micromamba clean --all --yes && \
    rm -f /tmp/environment.yml
