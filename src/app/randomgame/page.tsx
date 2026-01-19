"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, removeToken } from "../../utils/auth";
import { API_URL } from "../../utils/config";
import styles from "../../styles/RandomGame.module.css";
import Image from "next/image";
import Link from "next/link";

type Game = {
    id: number;
    title: string;
    description: string;
    release_date: string;
    artwork_url: string;
    rating: number;
    total_rating: number;
    rating_count: number;
    screenshots: string;
    genres: string;
    created_at: string;
    inventory: {
        inventory_id: number;
        platform_name: string;
        quantity: number;
    }[];
};

type HistoryEntry = {
    id: number;
    timestamp: string;
};



export default function Dashboard() {
    const router = useRouter();

    // authentication
    const [token, setToken] = useState<string | null>(null);
    const userRole =
        typeof window !== "undefined" ? localStorage.getItem("userRole") : null;

    // game state
    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(false);
    const [animating, setAnimating] = useState(false);

    // history state
    const [showHistory, setShowHistory] = useState(false);
    const [gameHistoryIds, setGameHistoryIds] = useState<HistoryEntry[]>([]);
    const [historyDetails, setHistoryDetails] = useState<
        (Game & { timestamp: string })[]
    >([]);



    // loading messages
    const randomTips = [
        "Przygotowuję dla Ciebie coś wyjątkowego…",
        "Daj mi chwilę, szukam inspiracji…",
        "Łączę się z biblioteką gier…",
        "Już za moment podzielę się grą…",
        "Poczekaj chwilę, gra jest w drodze…",
        "Szybciej z tą losówką!",
        "I'm playing Minecraft!",
    ];
    const [loadingMessage, setLoadingMessage] = useState<string>("");

    // localStorage helpers
    const HISTORY_KEY = "gameHistory";
    function saveHistory(entries: HistoryEntry[]) {
        const encoded = window.btoa(JSON.stringify(entries));
        localStorage.setItem(HISTORY_KEY, encoded);
    }
    function loadHistory(): HistoryEntry[] {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (!raw) return [];
        try {
            return JSON.parse(window.atob(raw));
        } catch {
            localStorage.removeItem(HISTORY_KEY);
            return [];
        }
    }



    // init: load history
    useEffect(() => {
        setGameHistoryIds(loadHistory());
    }, []);



    // init: load token on route change
    useEffect(() => {
        setToken(getToken());
    }, [router]);

    // space key handler
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.code === "Space" && !showHistory) {
                e.preventDefault();
                if (!loading && !animating) fetchGame();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [loading, animating, showHistory]);

    // fetch random game & update stats
    const fetchGame = async () => {
        setGame(null);
        setLoadingMessage(
            randomTips[Math.floor(Math.random() * randomTips.length)]
        );
        setAnimating(true);
        setLoading(true);

        setTimeout(async () => {
            try {
                const url = `${API_URL}/games/random`;
                const res = await fetch(url);
                if (!res.ok) throw new Error("Błąd pobierania gry");
                const data: Game = await res.json();
                setGame(data);

                // update history
                const entry: HistoryEntry = {
                    id: data.id,
                    timestamp: new Date().toISOString(),
                };
                const updated = [entry, ...gameHistoryIds].slice(0, 10);
                setGameHistoryIds(updated);
                saveHistory(updated);
            } catch {
                setGame(null);
            } finally {
                setAnimating(false);
                setLoading(false);
            }
        }, 1500);
    };

    // fetch details for history modal
    useEffect(() => {
        if (!showHistory) return;
        (async () => {
            try {
                const all = await Promise.all(
                    gameHistoryIds.map(async ({ id, timestamp }) => {
                        const res = await fetch(`${API_URL}/games/${id}`);
                        if (!res.ok) throw new Error();
                        const g: Game = await res.json();
                        return { ...g, timestamp };
                    })
                );
                setHistoryDetails(all);
            } catch {
                setHistoryDetails([]);
            }
        })();
    }, [showHistory, gameHistoryIds]);

    // clear history
    const deleteHistory = () => {
        setGameHistoryIds([]);
        setHistoryDetails([]);
        localStorage.removeItem(HISTORY_KEY);
        setShowHistory(false);
    };

    // logout
    const handleLogout = () => {
        removeToken();
        setToken(null);
        router.push("/");
    };

    // parse screenshots helper
    const parseScreenshots = (screenshotsStr: string): string[] => {
        return screenshotsStr.split(",");
    };

    // Get available platforms
    const getAvailablePlatforms = (inventory: Game["inventory"]): string => {
        return inventory
            .filter((inv) => inv.quantity > 0)
            .map((inv) => inv.platform_name)
            .join(", ") || "Brak dostępnych platform";
    };

    // common draw panel with stats moved above
    const renderDrawPanel = () => (
        <>
            <h1>Wylosuj grę!</h1>
            <p>Naciśnij spację lub kliknij przycisk aby wylosować grę:</p>

            <button onClick={fetchGame} disabled={loading || animating}>
                {loading || animating ? "Losowanie..." : "Losuj grę 🎲"}
            </button>

            {animating && (
                <div style={{ marginTop: 32, textAlign: "center" }}>
                    <div
                        style={{
                            fontSize: 32,
                            animation: "spin 1.5s linear infinite",
                        }}
                    >
                        🎲
                    </div>
                    <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
                    <p style={{ marginTop: 16, fontStyle: "italic" }}>
                        {loadingMessage}
                    </p>
                </div>
            )}

            {!animating && game && (
                <div style={{ marginTop: 32, textAlign: "center" }}>
                    {game.artwork_url && (
                        <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>
                            <img
                                src={game.artwork_url}
                                alt={`${game.title} artwork`}
                                style={{
                                    maxWidth: 300,
                                    maxHeight: 400,
                                    borderRadius: 8,
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                                }}
                            />
                        </div>
                    )}

                    <h2 style={{ marginBottom: 10, fontSize: 28 }}>{game.title}</h2>

                    <div style={{ marginBottom: 15 }}>
                        <p style={{ fontSize: 16, color: "#666" }}>
                            <strong>Platformy:</strong> {getAvailablePlatforms(game.inventory)}
                        </p>
                    </div>

                    {game.genres && (
                        <p style={{ fontSize: 16, color: "#666", marginBottom: 10 }}>
                            <strong>Gatunki:</strong> {game.genres}
                        </p>
                    )}

                    <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #ddd" }}>
                        <p style={{ marginBottom: 10 }}><strong>Opis:</strong></p>
                        <p style={{ textAlign: "left", maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
                            {game.description}
                        </p>
                    </div>

                    <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 30 }}>
                        <div>
                            <p><strong>Ocena:</strong> {game.rating.toFixed(1)} / 100</p>
                        </div>
                        <div>
                            <p><strong>Liczba ocen:</strong> {game.rating_count}</p>
                        </div>
                        <div>
                            <p><strong>Data wydania:</strong> {new Date(game.release_date).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {game.screenshots && (
                        <div style={{ marginTop: 30 }}>
                            <strong style={{ fontSize: 18 }}>Zrzuty ekranu:</strong>
                            <div style={{ display: "flex", gap: 8, marginTop: 15, flexWrap: "wrap", justifyContent: "center" }}>
                                {parseScreenshots(game.screenshots).slice(0, 6).map((screenshot, idx) => (
                                    <img
                                        key={idx}
                                        src={screenshot}
                                        alt={`Screenshot ${idx + 1}`}
                                        style={{ width: 200, height: 120, objectFit: "cover", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {game.inventory && game.inventory.length > 0 && (
                        <div style={{ marginTop: 30, paddingTop: 20, borderTop: "1px solid #ddd" }}>
                            <strong style={{ fontSize: 18 }}>Dostępność w sklepie:</strong>
                            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 15, flexWrap: "wrap" }}>
                                {game.inventory.map((inv) => (
                                    <div
                                        key={inv.inventory_id}
                                        style={{
                                            padding: "10px 20px",
                                            backgroundColor: inv.quantity > 0 ? "#d4edda" : "#f8d7da",
                                            border: `1px solid ${inv.quantity > 0 ? "#c3e6cb" : "#f5c6cb"}`,
                                            borderRadius: 6,
                                            minWidth: 120
                                        }}
                                    >
                                        <p style={{ fontWeight: "bold", marginBottom: 5 }}>{inv.platform_name}</p>
                                        <p style={{ color: inv.quantity > 0 ? "#155724" : "#721c24" }}>
                                            {inv.quantity > 0 ? `${inv.quantity} szt.` : "Brak"}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </>
    );

    // admin panel
    if (token && userRole === "0") {
        return (
            <div className={styles.randomquoteWrapper}>
                <div className={styles.randomquoteBar}>
                    <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                        <Link href="/">
                            <Image
                                src="/images/logo.png"
                                alt="Logo"
                                width={100}
                                height={100}
                                priority
                            />
                        </Link>
                    </div>
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                        }}
                    >
                        <button onClick={() => router.push("/")}>
                            Biblioteka gier
                        </button>
                        <button onClick={() => router.push("/new")}>
                            Nowe gry
                        </button>
                        <button onClick={() => router.push("/dashboard")}>
                            Panel Administratora
                        </button>
                        <button onClick={() => setShowHistory(true)}>
                            Historia losowań
                        </button>
                        <button
                            onClick={handleLogout}
                            style={{ backgroundColor: "#cc0000" }}
                        >
                            Wyloguj się
                        </button>
                    </div>
                </div>

                <div className={styles.randomquoteContainer}>
                    {renderDrawPanel()}
                </div>

                {showHistory && (
                    <div
                        className={styles.modalOverlay}
                        onClick={() => setShowHistory(false)}
                    >
                        <div
                            className={styles.modalContent}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 style={{ color: "#1a1a1a" }}>Historia wylosowanych gier</h2>
                            <div className={styles.historyList}>
                                {historyDetails.length === 0 ? (
                                    <p style={{ color: "#1a1a1a" }}>Brak historii – wylosuj pierwszą grę!</p>
                                ) : (
                                    historyDetails.map((hg, i) => (
                                        <div key={i} className={styles.historyItem}>
                                            <p className={styles.timestamp}>
                                                {new Date(hg.timestamp).toLocaleString()}
                                            </p>
                                            <p><strong>Tytuł:</strong> {hg.title}</p>
                                            <p><strong>Platformy:</strong> {getAvailablePlatforms(hg.inventory)}</p>
                                            <p><strong>Ocena:</strong> {hg.rating.toFixed(1)} / 100</p>
                                            {hg.genres && (
                                                <p><strong>Gatunki:</strong> {hg.genres}</p>
                                            )}
                                            {hg.artwork_url && (
                                                <img
                                                    src={hg.artwork_url}
                                                    alt={hg.title}
                                                    style={{ maxWidth: 150, borderRadius: 4, marginTop: 10 }}
                                                />
                                            )}
                                        </div>
                                    ))
                                )}
                                <button
                                    className={styles.deleteButton}
                                    onClick={deleteHistory}
                                >
                                    Wyczyść historię
                                </button>
                                <button
                                    className={styles.closeButton}
                                    onClick={() => setShowHistory(false)}
                                >
                                    Zamknij
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // guest/user panel
    if (!token) {
        return (
            <div className={styles.randomquoteWrapper}>
                <div className={styles.randomquoteBar}>
                    <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                        <Link href="/">
                            <Image
                                src="/images/logo.png"
                                alt="Logo"
                                width={100}
                                height={100}
                                priority
                            />
                        </Link>
                    </div>
                    <div style={{ flex: 1 }} />
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            justifyContent: "flex-end",
                            alignItems: "center",
                        }}
                    >
                        <button onClick={() => router.push("/")}>
                            Biblioteka gier
                        </button>
                        <button onClick={() => router.push("/new")}>
                            Nowe gry
                        </button>
                        <button onClick={() => setShowHistory(true)}>
                            Historia losowań
                        </button>
                    </div>
                </div>

                <div className={styles.randomquoteContainer}>
                    {renderDrawPanel()}
                </div>

                {showHistory && (
                    <div
                        className={styles.modalOverlay}
                        onClick={() => setShowHistory(false)}
                    >
                        <div
                            className={styles.modalContent}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 style={{ color: "#1a1a1a" }}>Historia wylosowanych gier</h2>
                            <div className={styles.historyList}>
                                {historyDetails.length === 0 ? (
                                    <p style={{ color: "#1a1a1a" }}>Brak historii – wylosuj pierwszą grę!</p>
                                ) : (
                                    historyDetails.map((hg, i) => (
                                        <div key={i} className={styles.historyItem}>
                                            <p className={styles.timestamp}>
                                                {new Date(hg.timestamp).toLocaleString()}
                                            </p>
                                            <p><strong>Tytuł:</strong> {hg.title}</p>
                                            <p><strong>Platformy:</strong> {getAvailablePlatforms(hg.inventory)}</p>
                                            <p><strong>Ocena:</strong> {hg.rating.toFixed(1)} / 100</p>
                                            {hg.genres && (
                                                <p><strong>Gatunki:</strong> {hg.genres}</p>
                                            )}
                                            {hg.artwork_url && (
                                                <img
                                                    src={hg.artwork_url}
                                                    alt={hg.title}
                                                    style={{ maxWidth: 150, borderRadius: 4, marginTop: 10 }}
                                                />
                                            )}
                                        </div>
                                    ))
                                )}
                                <button
                                    className={styles.deleteButton}
                                    onClick={deleteHistory}
                                >
                                    Wyczyść historię
                                </button>
                                <button
                                    className={styles.closeButton}
                                    onClick={() => setShowHistory(false)}
                                >
                                    Zamknij
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return null;
}