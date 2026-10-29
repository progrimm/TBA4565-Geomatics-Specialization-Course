import pytest
from fastapi.testclient import TestClient
from psycopg.errors import UndefinedTable

import main

GREENLAND = {"country_code": "GRL"}


@pytest.fixture
def client_with(monkeypatch):
    """A test client whose area table holds the given rows (None = no table)."""

    def make(rows):
        def read_table(code=None):
            if rows is None:
                raise UndefinedTable("relation does not exist")
            return [row for row in rows if code is None or row["country_code"] == code]

        monkeypatch.setattr(main, "read_table", read_table)
        monkeypatch.setattr(main, "to_response", lambda row: row)
        return TestClient(main.app)

    return make


def test_known_code_is_case_insensitive(client_with):
    response = client_with([GREENLAND]).get("/countries/grl/areas")
    assert response.status_code == 200
    assert response.json() == GREENLAND


def test_unknown_code_returns_404(client_with):
    assert client_with([GREENLAND]).get("/countries/XXX/areas").status_code == 404


@pytest.mark.parametrize("rows", [None, []], ids=["missing table", "empty table"])
@pytest.mark.parametrize("path", ["/countries/areas", "/countries/GRL/areas"])
def test_uncomputed_statistics_return_503(client_with, rows, path):
    response = client_with(rows).get(path)
    assert response.status_code == 503
    assert "country_areas.py compute" in response.json()["detail"]
