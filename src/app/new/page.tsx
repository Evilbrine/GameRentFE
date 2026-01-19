"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../../utils/config";
import styles from "../../styles/New.module.css";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

type Game = {
    id: number;
    name: string;
    artwork_url: string;
    rating: number;
};

type ApiResponse = {
    meta: {
        total_items: number;
        total_pages: number;
        current_page: number;
        per_page: number;
    };
    data: Game[];
};

export default function Dashboard() {
    const router = useRouter();
    const [games, setGames] = useState<Game[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [newGamesAnimating, setNewGamesAnimating] = useState(false);

    const ITEMS_PER_LOAD = 3;

    useEffect(() => {
        fetchInitialGames();
    }, []);

    const fetchInitialGames = async () => {
        setLoading(true);
        try {
            // Fetch first 3 pages (9 games total) at once
            const promises = [];
            for (let page = 1; page <= 3; page++) {
                promises.push(
                    fetch(`${API_URL}/games/new?page=${page}&limit=${ITEMS_PER_LOAD}`)
                        .then(res => res.ok ? res.json() : null)
                );
            }

            const results = await Promise.all(promises);
            const allGames: Game[] = [];
            const seenIds = new Set<number>();

            results.forEach((data, pageIndex) => {
                if (data && data.data) {
                    console.log(`Page ${pageIndex + 1} games:`, data.data.map((g: Game) => g.id));
                    data.data.forEach((game: Game) => {
                        if (!seenIds.has(game.id)) {
                            seenIds.add(game.id);
                            allGames.push(game);
                        } else {
                            console.warn(`Duplicate game ID ${game.id} found in page ${pageIndex + 1}`);
                        }
                    });
                }
            });

            console.log("Total unique games loaded:", allGames.length);
            setGames(allGames);
            setCurrentPage(3); // We've loaded pages 1-3

            // Get total pages from the first response
            if (results[0]) {
                setTotalPages(results[0].meta.total_pages);
            }
        } catch (error) {
            console.error("Failed to fetch games:", error);
            setGames([]);
        } finally {
            setLoading(false);
        }
    };

    const loadMoreGames = async () => {
        setLoading(true);
        setNewGamesAnimating(true);
        try {
            const newGames: Game[] = [];
            const existingIds = new Set(games.map(g => g.id));
            let pageToFetch = currentPage + 1;

            // Keep fetching pages until we have at least 3 new games or run out of pages
            while (newGames.length < ITEMS_PER_LOAD && pageToFetch <= totalPages) {
                console.log(`Loading page ${pageToFetch}`);
                const url = `${API_URL}/games/new?page=${pageToFetch}&limit=${ITEMS_PER_LOAD}`;
                const res = await fetch(url);

                if (!res.ok) throw new Error("Error fetching games");
                const data: ApiResponse = await res.json();

                console.log(`Page ${pageToFetch} games:`, data.data.map(g => g.id));

                // Add non-duplicate games
                data.data.forEach(game => {
                    if (!existingIds.has(game.id) && newGames.findIndex(g => g.id === game.id) === -1) {
                        newGames.push(game);
                        existingIds.add(game.id);
                    } else if (existingIds.has(game.id)) {
                        console.warn(`Duplicate game ID ${game.id} found in page ${pageToFetch}`);
                    }
                });

                pageToFetch++;
            }

            console.log(`Adding ${newGames.length} new games`);
            setGames(prev => [...prev, ...newGames]);
            setCurrentPage(pageToFetch - 1);

            setTimeout(() => setNewGamesAnimating(false), 500);
        } catch (error) {
            console.error("Failed to fetch games:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        loadMoreGames();
    };

    const hasMore = currentPage < totalPages;

    return (
        <div>
            <div className={styles.dashboardBar}>
                <Link href="/">
                    <Image
                        src="/images/logo.png"
                        alt="Logo"
                        width={100}
                        height={100}
                        priority
                    />
                </Link>

                <button onClick={() => router.push("/")}>
                    Biblioteka gier
                </button>

                <button onClick={() => router.push("/randomgame")}>
                    Losowa gra
                </button>
            </div>

            <div className={styles.dashboardContainer}>
                <h1>Game Library</h1>

                {loading && games.length === 0 ? (
                    <p>Loading...</p>
                ) : (
                    <>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, 1fr)",
                                gap: "2rem",
                                marginTop: "2rem",
                            }}
                        >
                            {games.map((game, index) => {
                                const isNewGame = index >= games.length - ITEMS_PER_LOAD && newGamesAnimating;
                                return (
                                    <div
                                        key={`${game.id}-${index}`}
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            cursor: "pointer",
                                            transition: "transform 0.2s, opacity 0.5s ease-in",
                                            opacity: isNewGame ? 0 : 1,
                                            animation: isNewGame ? "fadeIn 0.5s ease-in forwards" : "none",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = "scale(1.05)";
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = "scale(1)";
                                        }}
                                    >
                                        <img
                                            src={game.artwork_url}
                                            alt={game.name}
                                            style={{
                                                width: "100%",
                                                maxWidth: "264px",
                                                height: "auto",
                                                borderRadius: "8px",
                                                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                                            }}
                                        />
                                        <h3
                                            style={{
                                                marginTop: "1rem",
                                                textAlign: "center",
                                                fontSize: "1rem",
                                                fontWeight: "600",
                                            }}
                                        >
                                            {game.name}
                                        </h3>
                                    </div>
                                );
                            })}
                        </div>

                        {hasMore && (
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "center",
                                    marginTop: "3rem",
                                }}
                            >
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loading}
                                    style={{
                                        padding: "0.75rem 2rem",
                                        cursor: loading ? "not-allowed" : "pointer",
                                        opacity: loading ? 0.5 : 1,
                                        fontSize: "1rem",
                                    }}
                                >
                                    {loading ? "Loading..." : "Load More"}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </div>
    );
}