"""Tests for the pure parts of 01b_fetch_airtable_to_sql.py (no Airtable or database access)."""

import importlib
from datetime import date

import pytest

pipeline = importlib.import_module("01b_fetch_airtable_to_sql")


def rec(record_id, **fields):
    return {"id": record_id, "fields": fields}


# ---------------------------------------------------------------------------
# IDs
# ---------------------------------------------------------------------------


def test_make_uuid_is_stable_across_runs():
    # The app and shared links rely on IDs not changing between daily imports.
    assert pipeline.make_uuid("org::recABC") == "42afcc24-272f-5203-9c94-43e123173a30"


def test_junction_uuid_depends_on_order():
    assert pipeline.make_junction_uuid("a", "b") != pipeline.make_junction_uuid(
        "b", "a"
    )


# ---------------------------------------------------------------------------
# Cleaning and row builders
# ---------------------------------------------------------------------------


def test_clean_records_strips_strings_and_list_items():
    records = [rec("rec1", name="  Alpha \n", links=[" recA ", 3], budget=10)]
    pipeline.clean_records(records)
    assert records[0]["fields"] == {"name": "Alpha", "links": ["recA", 3], "budget": 10}


def test_build_organizations_rows():
    orgs = [
        rec(
            "recOrg",
            **{
                "Org Full Name": "Alpha Org",
                "Org Type": "NGO",
                "Org HQ Country": ["Germany", "France"],
                "Est. Org Budget": "1500000",
                "Org Programme Budget": "n/a",
                "Last Updated": "2024",
            },
        )
    ]
    rows, at_map = pipeline.build_organizations_rows(
        orgs, {"NGO": "type-ngo"}, {"Germany": "country-de"}
    )

    row = rows[0]
    assert at_map == {"recOrg": pipeline.make_uuid("org::recOrg")}
    assert row[0] == at_map["recOrg"]
    assert row[2] == "Alpha Org"
    assert row[6:10] == ("type-ngo", "country-de", 1500000.0, None)
    assert row[-1] == date(2024, 1, 1)


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (True, True),
        (False, False),
        ("Yes", True),
        ("no", False),
        ("None", False),
        ("", False),
        (None, None),
    ],
)
def test_build_projects_rows_parses_hdx_sohd(raw, expected):
    fields = {"Project/Product Name": "Flood Mapping"}
    if raw is not None:
        fields["HDX_SOHD"] = raw
    rows, _ = pipeline.build_projects_rows([rec("recP", **fields)])
    assert rows[0][-1] is expected


# ---------------------------------------------------------------------------
# Countries and UN member states
# ---------------------------------------------------------------------------


def donor(record_id, name, iso=None):
    fields = {"Donor Name": name}
    if iso is not None:
        fields["ISO alpha-3"] = iso
    return rec(record_id, **fields)


def test_country_codes_follow_record_links():
    agencies = [rec("recA1", **{"Agency Associated Country": ["recNL"]})]
    orgs = [rec("recO1", **{"HQ Country": ["recKH", "recEU"]})]
    donors = [
        donor("recNL", "Netherlands", "nld"),
        donor("recKH", "Cambodia", "KHM"),
        donor("recEU", "European Union"),
        donor("recXX", "Unlinked", "XXX"),
    ]
    assert pipeline.build_country_codes(agencies, orgs, donors) == {
        "Netherlands": "NLD",
        "Cambodia": "KHM",
        "European Union": None,
    }


def test_country_codes_warn_on_conflicts_and_bad_codes(capsys):
    # Two records named "Netherlands" with different codes is how a renamed UK
    # record shows up; a code used twice is e.g. "USA" next to "United States".
    agencies = [
        rec("recA1", **{"Agency Associated Country": ["rec1"]}),
        rec("recA2", **{"Agency Associated Country": ["rec2"]}),
        rec("recA3", **{"Agency Associated Country": ["rec3", "rec4", "rec5"]}),
    ]
    donors = [
        donor("rec1", "Netherlands", "NLD"),
        donor("rec2", "Netherlands", "GBR"),
        donor("rec3", "USA", "USA"),
        donor("rec4", "United States", "USA"),
        donor("rec5", "Atlantis", "AT"),
    ]
    codes = pipeline.build_country_codes(agencies, [], donors)

    assert codes["Netherlands"] == "NLD"
    assert codes["Atlantis"] is None
    out = capsys.readouterr().out
    assert "named 'Netherlands' but have different ISO alpha-3 codes" in out
    assert "ISO alpha-3 USA is used by several countries" in out
    assert "rec5 ('Atlantis') ISO alpha-3 is not a 3-letter code" in out


def test_un_member_state_list():
    rows = pipeline.load_un_member_states()
    codes = [code for code, _ in rows]
    assert len(rows) == 193
    assert len(set(codes)) == 193
    assert all(pipeline.ISO_ALPHA3_RE.fullmatch(code) for code in codes)
    # Cambodia was missing from the old hard-coded list
    assert ("KHM", "Cambodia") in rows


# ---------------------------------------------------------------------------
# Junction tables
# ---------------------------------------------------------------------------


def test_build_organization_project_dedupes_and_skips_unknown_projects():
    orgs = [
        rec(
            "recOrg",
            **{"Provided Data Ecosystem Projects": ["recP1", "recP1", "recGone"]},
        )
    ]
    rows = pipeline.build_organization_project(
        orgs, {"recOrg": "org-1"}, {"recP1": "proj-1"}
    )
    assert rows == [(pipeline.make_junction_uuid("recOrg", "recP1"), "org-1", "proj-1")]


def test_build_project_themes_uses_theme_table_links():
    themes = [
        rec("recT1", **{"Data Ecosystem Projects": ["recP1", "recP2", "recP1"]}),
        rec("recT2", **{"Data Ecosystem Projects": ["recGone"]}),
    ]
    rows = pipeline.build_project_themes(
        themes,
        theme_at_map={"recT1": "theme-1", "recT2": "theme-2"},
        project_at_map={"recP1": "proj-1", "recP2": "proj-2"},
    )
    assert [(r[1], r[2]) for r in rows] == [
        ("proj-1", "theme-1"),
        ("proj-2", "theme-1"),
    ]
    assert rows[0][0] == pipeline.make_junction_uuid("recP1", "recT1")


def test_build_agency_project_funding_skips_unknown_agencies():
    projects = [rec("recP1", **{"Project Donor Agencies": ["recA1", "recGone"]})]
    rows = pipeline.build_agency_project_funding(
        projects, {"recA1": "agency-1"}, {"recP1": "proj-1"}
    )
    assert [(r[1], r[2]) for r in rows] == [("agency-1", "proj-1")]


# ---------------------------------------------------------------------------
# Safety checks
# ---------------------------------------------------------------------------


class FakeCursor:
    """Answers check_no_large_drop's two queries from a {table: row_count} dict."""

    def __init__(self, counts):
        self.counts = counts
        self.result = None

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, params=None):
        if sql.startswith("SELECT to_regclass"):
            table = params[0].split(".")[1]
            self.result = (table if table in self.counts else None,)
        else:
            table = sql.rsplit(".", 1)[1]
            self.result = (self.counts[table],)

    def fetchone(self):
        return self.result


class FakeConn:
    def __init__(self, counts):
        self.counts = counts

    def cursor(self):
        return FakeCursor(self.counts)


@pytest.fixture(autouse=True)
def no_override(monkeypatch):
    monkeypatch.delenv("ALLOW_LARGE_DROP", raising=False)


def test_large_drop_aborts():
    with pytest.raises(RuntimeError, match="projects"):
        pipeline.check_no_large_drop(FakeConn({"projects": 200}), {"projects": 99})


def test_drop_to_exactly_half_is_allowed():
    pipeline.check_no_large_drop(FakeConn({"projects": 200}), {"projects": 100})


def test_new_tables_are_not_compared():
    pipeline.check_no_large_drop(FakeConn({}), {"projects": 1})


def test_large_drop_override(monkeypatch):
    monkeypatch.setenv("ALLOW_LARGE_DROP", "1")
    pipeline.check_no_large_drop(FakeConn({"projects": 200}), {"projects": 1})


def test_quality_warnings_flag_unlinked_projects_and_bad_links(capsys):
    projects = [
        rec(
            "recP1",
            **{
                "Project/Product Name": "Linked",
                "Project Website": "https://example.org",
            },
        ),
        rec(
            "recP2",
            **{"Project/Product Name": "Orphan", "Project Website": "www.example.org"},
        ),
    ]
    orgs = [
        rec(
            "recOrg", org_key="alpha", **{"Provided Data Ecosystem Projects": ["recP1"]}
        )
    ]
    pipeline.report_quality_warnings(projects, orgs, themes=[])

    out = capsys.readouterr().out
    assert "recP1" not in out
    assert "recP2 ('Orphan') is not linked" in out
    assert "recP2 ('Orphan') website is not an http(s) link" in out
