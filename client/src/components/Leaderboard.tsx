import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

interface LeaderboardEntry {
  id: number;
  userId: number;
  score: number;
  gameMode: string;
  enemiesKilled: number;
  timePlayedSeconds: number;
  createdAt: Date;
  userEmail: string | null;
}

export default function Leaderboard() {
  const { data: leaderboard, isLoading } = trpc.scores.getLeaderboard.useQuery({ limit: 10 });
  const [displayScores, setDisplayScores] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (leaderboard) {
      setDisplayScores(leaderboard as LeaderboardEntry[]);
    }
  }, [leaderboard]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="border-2 border-red-600 bg-black p-4">
        <h2 className="text-2xl font-bold text-red-600 text-center mb-4" style={{ fontFamily: "monospace" }}>
          TOP SCORES
        </h2>

        {isLoading ? (
          <div className="text-center text-red-500" style={{ fontFamily: "monospace" }}>
            LOADING...
          </div>
        ) : displayScores.length === 0 ? (
          <div className="text-center text-red-500" style={{ fontFamily: "monospace" }}>
            NO SCORES YET
          </div>
        ) : (
          <div className="space-y-2">
            {displayScores.map((entry, index) => (
              <div
                key={entry.id}
                className="flex justify-between items-center p-2 border-b border-red-600/30 hover:bg-red-600/10 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-red-600 font-bold w-8" style={{ fontFamily: "monospace" }}>
                    #{index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-red-500" style={{ fontFamily: "monospace" }}>
                      {entry.userEmail?.split("@")[0] || "Anonymous"}
                    </p>
                    <p className="text-red-900 text-xs" style={{ fontFamily: "monospace" }}>
                      {entry.gameMode.toUpperCase()} • {entry.enemiesKilled} kills
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-red-600 font-bold text-lg" style={{ fontFamily: "monospace" }}>
                    {entry.score}
                  </p>
                  <p className="text-red-900 text-xs" style={{ fontFamily: "monospace" }}>
                    {Math.floor(entry.timePlayedSeconds / 60)}m {entry.timePlayedSeconds % 60}s
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
