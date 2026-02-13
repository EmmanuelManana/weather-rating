import { useLazyQuery } from "@apollo/client";
import { useCallback, useState } from "react";
import { GET_CITY_RANKING } from "./graphql/queries";
import { RankingResults } from "./RankingResults";

export default function App() {
  const [city, setCity] = useState("");
  const [getRanking, { data, loading, error }] = useLazyQuery(GET_CITY_RANKING, {
    variables: { city: city || undefined },
    fetchPolicy: "network-only",
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (city.trim()) getRanking({ variables: { city: city.trim() } });
    },
    [city, getRanking]
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Weather Rating</h1>
        <p style={styles.subtitle}>
          See how desirable a city is for activities over the next 7 days
        </p>
      </header>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City or town name..."
          style={styles.input}
          disabled={loading}
          aria-label="City or town name"
        />
        <button type="submit" disabled={loading || !city.trim()} style={styles.button}>
          {loading ? "Loading…" : "Get ranking"}
        </button>
      </form>

      {error && (
        <div style={styles.error}>
          {error.message}
        </div>
      )}

      {data?.getCityRanking && (
        <RankingResults ranking={data.getCityRanking} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "2rem 1.5rem",
  },
  header: {
    marginBottom: "2rem",
    textAlign: "center",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    margin: 0,
    color: "var(--text)",
  },
  subtitle: {
    margin: "0.5rem 0 0",
    color: "var(--muted)",
    fontSize: "0.95rem",
  },
  form: {
    display: "flex",
    gap: "0.75rem",
    marginBottom: "2rem",
  },
  input: {
    flex: 1,
    padding: "0.75rem 1rem",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text)",
    outline: "none",
  },
  button: {
    padding: "0.75rem 1.25rem",
    background: "var(--accent)",
    color: "var(--bg)",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    cursor: "pointer",
  },
  error: {
    padding: "1rem",
    background: "rgba(248, 81, 73, 0.15)",
    border: "1px solid var(--bad)",
    borderRadius: 8,
    color: "var(--bad)",
    marginBottom: "1rem",
  },
};
