#!/bin/sh
# DB를 처음 만들 때 한 번만 실행된다(pgdata가 비어 있을 때). 운영 · 스테이징이 서로의 데이터를 못 보게 사용자를 나눈다
set -eu
psql -v ON_ERROR_STOP=1 -U postgres <<SQL
CREATE ROLE cookie_prod LOGIN PASSWORD '${PROD_DB_PASSWORD}';
CREATE ROLE cookie_staging LOGIN PASSWORD '${STAGING_DB_PASSWORD}';
CREATE DATABASE cookie_prod OWNER cookie_prod ENCODING 'UTF8' TEMPLATE template0;
CREATE DATABASE cookie_staging OWNER cookie_staging ENCODING 'UTF8' TEMPLATE template0;
REVOKE ALL ON DATABASE cookie_prod FROM PUBLIC;
REVOKE ALL ON DATABASE cookie_staging FROM PUBLIC;
SQL
