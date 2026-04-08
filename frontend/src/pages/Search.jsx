import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchMentors } from "../api/search";
import toast from "react-hot-toast";

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "rating", label: "Top Rated" },
  { value: "experience", label: "Most Experienced" },
];

const RATING_OPTIONS = [
  { value: "", label: "Any Rating" },
  { value: "4.5", label: "4.5+" },
  { value: "4", label: "4.0+" },
  { value: "3", label: "3.0+" },
];

function StarRating({ rating }) {
  const num = parseFloat(rating) || 0;
  return (
    <span style={{ color: "#f59e0b", fontSize: 13 }}>
      {"★".repeat(Math.floor(num))}{"☆".repeat(5 - Math.floor(num))}
      <span style={{ color: "#6b6b6b", marginLeft: 4 }}>{num.toFixed(1)}</span>
    </span>
  );
}

function ResultCard({ person }) {
  return (
    <div className="card-sm" style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      {/* Avatar */}
      <div style={{
        width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
        background: person.role === "mentor" ? "#dbeafe" : "#f3f4f6",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, fontWeight: 600,
        color: person.role === "mentor" ? "#1d4ed8" : "#374151",
      }}>
        {person.name?.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
          <div>
            <Link
              to={`/profile/${person.user_id}`}
              style={{ fontWeight: 600, fontSize: 15, color: "var(--text)" }}
            >
              {person.name}
            </Link>
            <span
              className={`badge ${person.role === "mentor" ? "badge-blue" : "badge-gray"}`}
              style={{ marginLeft: 8, fontSize: 11 }}
            >
              {person.role}
            </span>
          </div>
          {parseFloat(person.avg_rating) > 0 && (
            <StarRating rating={person.avg_rating} />
          )}
        </div>

        {person.bio && (
          <p className="text-sm text-muted mt-1" style={{
            overflow: "hidden", display: "-webkit-box",
            WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>
            {person.bio}
          </p>
        )}

        {person.availability && (
          <p className="text-sm mt-1">
            <span className="text-muted">Available: </span>{person.availability}
          </p>
        )}

        {/* Skills */}
        {person.skills?.length > 0 && (
          <div className="row mt-1" style={{ flexWrap: "wrap", gap: 6 }}>
            {person.skills.slice(0, 5).map((s) => (
              <span key={s.skill_id} className="badge badge-gray" style={{ fontSize: 11 }}>
                {s.skill_name}
              </span>
            ))}
            {person.skills.length > 5 && (
              <span className="text-muted" style={{ fontSize: 11 }}>
                +{person.skills.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* View profile button */}
      <Link
        to={`/profile/${person.user_id}`}
        className="btn btn-ghost"
        style={{ padding: "6px 14px", fontSize: 13, flexShrink: 0 }}
      >
        View
      </Link>
    </div>
  );
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Form state — initialize from URL params so links/bookmarks work
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [availability, setAvailability] = useState(searchParams.get("availability") || "");
  const [minRating, setMinRating] = useState(searchParams.get("minRating") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "relevance");

  // Results state
  const [results, setResults] = useState([]);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (params) => {
    setLoading(true);
    setSearched(true);
    try {
      // Build clean params — omit empty strings
      const cleanParams = {};
      if (params.q) cleanParams.q = params.q;
      if (params.availability) cleanParams.availability = params.availability;
      if (params.minRating) cleanParams.minRating = params.minRating;
      if (params.sortBy) cleanParams.sortBy = params.sortBy;

      const res = await searchMentors(cleanParams);
      const data = res.data.data;
      setResults(data.results);
      setFallbackUsed(data.fallbackUsed);
      setCount(data.count);

      // Sync URL params
      setSearchParams(cleanParams);
    } catch (err) {
      const msg = err.response?.data?.error?.message || "Search failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

  // Auto-search on mount if URL has query params
  useEffect(() => {
    const hasParams = searchParams.get("q") || searchParams.get("availability") ||
      searchParams.get("minRating") || searchParams.get("sortBy");
    if (hasParams) {
      doSearch({
        q: searchParams.get("q") || "",
        availability: searchParams.get("availability") || "",
        minRating: searchParams.get("minRating") || "",
        sortBy: searchParams.get("sortBy") || "relevance",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    doSearch({ q, availability, minRating, sortBy });
  };

  const handleClear = () => {
    setQ("");
    setAvailability("");
    setMinRating("");
    setSortBy("relevance");
    setResults([]);
    setSearched(false);
    setFallbackUsed(false);
    setCount(0);
    setSearchParams({});
  };

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <h2 className="mb-3">Find a Mentor</h2>

        {/* Search form */}
        <div className="card mb-3">
          <form onSubmit={handleSubmit} noValidate>

            {/* Keyword search */}
            <div className="form-group">
              <label>Skill or keyword</label>
              <input
                type="text"
                placeholder="e.g. JavaScript, Machine Learning, React..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            {/* Filters row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Availability</label>
                <input
                  type="text"
                  placeholder="e.g. weekends"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Min Rating</label>
                <select value={minRating} onChange={(e) => setMinRating(e.target.value)}>
                  {RATING_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="row" style={{ gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="spinner" /> : "Search"}
              </button>
              {searched && (
                <button type="button" className="btn btn-ghost" onClick={handleClear}>
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Results */}
        {searched && !loading && (
          <>
            {/* Results header */}
            <div className="row mb-2" style={{ justifyContent: "space-between" }}>
              <p className="text-sm text-muted">
                {count === 0
                  ? "No results found"
                  : `${count} result${count !== 1 ? "s" : ""} found`}
                {fallbackUsed && count > 0 && (
                  <span style={{ marginLeft: 8, color: "#f59e0b" }}>
                    (No mentors matched — showing users with these skills)
                  </span>
                )}
              </p>
            </div>

            {/* Result cards */}
            {count === 0 ? (
              <div className="card text-center" style={{ padding: "40px 20px" }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>🔍</p>
                <p style={{ fontWeight: 500 }}>No results found</p>
                <p className="text-muted text-sm mt-1">
                  Try a different skill or remove some filters.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {results.map((person) => (
                  <ResultCard key={person.user_id} person={person} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Empty state before first search */}
        {!searched && !loading && (
          <div className="card text-center" style={{ padding: "48px 20px" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🎯</p>
            <p style={{ fontWeight: 500, fontSize: 16 }}>Search for a mentor</p>
            <p className="text-muted text-sm mt-1">
              Enter a skill above to find mentors who can help you grow.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}