interface Location {
  name: string;
  country: string;
  countryCode: string;
  timezone: string;
}

interface Overall {
  skiing: number;
  surfing: number;
  outdoorSightseeing: number;
  indoorSightseeing: number;
}

interface DayRanking {
  date: string;
  skiing: number;
  surfing: number;
  outdoorSightseeing: number;
  indoorSightseeing: number;
}

interface CityRanking {
  location: Location;
  overall: Overall;
  daily: DayRanking[];
}

function scoreColor(score: number): string {
  if (score >= 70) return "var(--good)";
  if (score >= 40) return "var(--warn)";
  return "var(--bad)";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const ACTIVITIES = [
  { key: "skiing", label: "Skiing" },
  { key: "surfing", label: "Surfing" },
  { key: "outdoorSightseeing", label: "Outdoor sightseeing" },
  { key: "indoorSightseeing", label: "Indoor sightseeing" },
] as const;

type ActivityKey = (typeof ACTIVITIES)[number]["key"];

function getScore(obj: Overall | DayRanking, key: ActivityKey): number {
  return obj[key];
}

export function RankingResults({ ranking }: { ranking: CityRanking }) {
  const { location, overall, daily } = ranking;

  return (
    <section style={styles.section} aria-label="Ranking results">
      <h2 style={styles.locationName}>
        {location.name}, {location.country}
      </h2>
      <p style={styles.meta}>7-day forecast · {location.timezone}</p>

      <h3 style={styles.h3}>Overall score (0–100)</h3>
      <div style={styles.overallGrid}>
        {ACTIVITIES.map(({ key, label }) => (
          <div key={key} style={styles.overallCard}>
            <span style={styles.overallLabel}>{label}</span>
            <span
              style={{
                ...styles.overallScore,
                color: scoreColor(getScore(overall, key)),
              }}
            >
              {getScore(overall, key)}
            </span>
          </div>
        ))}
      </div>

      <h3 style={styles.h3}>By day</h3>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Date</th>
              {ACTIVITIES.map(({ label }) => (
                <th key={label} style={styles.th}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {daily.map((day) => (
              <tr key={day.date}>
                <td style={styles.td}>{formatDate(day.date)}</td>
                {ACTIVITIES.map(({ key }) => (
                  <td
                    key={key}
                    style={{
                      ...styles.td,
                      color: scoreColor(getScore(day, key)),
                      fontWeight: 600,
                    }}
                  >
                    {getScore(day, key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    padding: "1.5rem 0",
    borderTop: "1px solid var(--border)",
  },
  locationName: {
    fontSize: "1.35rem",
    margin: "0 0 0.25rem",
    color: "var(--text)",
  },
  meta: {
    margin: "0 0 1.5rem",
    color: "var(--muted)",
    fontSize: "0.9rem",
  },
  h3: {
    fontSize: "1rem",
    fontWeight: 600,
    margin: "0 0 0.75rem",
    color: "var(--muted)",
  },
  overallGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: "0.75rem",
    marginBottom: "2rem",
  },
  overallCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  overallLabel: {
    fontSize: "0.85rem",
    color: "var(--muted)",
  },
  overallScore: {
    fontSize: "1.5rem",
    fontWeight: 700,
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem",
  },
  th: {
    textAlign: "left",
    padding: "0.5rem 0.75rem",
    borderBottom: "1px solid var(--border)",
    color: "var(--muted)",
    fontWeight: 600,
  },
  td: {
    padding: "0.5rem 0.75rem",
    borderBottom: "1px solid var(--border)",
  },
};
