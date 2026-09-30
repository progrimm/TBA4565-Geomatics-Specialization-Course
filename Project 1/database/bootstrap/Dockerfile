FROM ghcr.io/osgeo/gdal:ubuntu-small-3.13.3

USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY import.sh /usr/local/bin/import.sh
RUN chmod 755 /usr/local/bin/import.sh

ENTRYPOINT ["/usr/local/bin/import.sh"]