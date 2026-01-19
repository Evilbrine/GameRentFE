"use client";
import { useEffect, useState } from "react";
import { API_URL } from "../utils/config";
import styles from "../styles/Dashboard.module.css";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getToken } from "../utils/auth";
import { validateToken } from "../utils/tokenValidation";

type Game = {
    id: number;
    name: string;
    artwork_url: string;
    rating: number;
    genres?: string;
};

type GameDetails = {
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
    inventory: {
        inventory_id: number;
        platform_name: string;
        quantity: number;
    }[];
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
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Modal states
    const [selectedGame, setSelectedGame] = useState<GameDetails | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [rentalMessage, setRentalMessage] = useState("");
    const [rentalError, setRentalError] = useState("");

    // Filter states
    const [minRating, setMinRating] = useState("20");
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    // Available options
    const [availableGenres, setAvailableGenres] = useState<string[]>([]);
    const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);

    const ITEMS_PER_PAGE = 15; // 3 columns × 5 rows

    // Fetch available genres and platforms on mount
    useEffect(() => {
        fetchAvailableOptions();
        // Check if user is logged in and validate token
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = getToken();
        if (token) {
            const isValid = await validateToken();
            setIsLoggedIn(isValid);
        } else {
            setIsLoggedIn(false);
        }
    };

    const fetchAvailableOptions = async () => {
        // Since /games/filter doesn't return genres/platforms, 
        // we'll use hardcoded lists based on your database
        // This is more efficient than fetching individual games

        setAvailableGenres([
            "Action",
            "Adventure",
            "Arcade",
            "Card & Board Game",
            "Fighting",
            "Hack and slash/Beat 'em up",
            "Indie",
            "Music",
            "Pinball",
            "Platform",
            "Point-and-click",
            "Puzzle",
            "Quiz/Trivia",
            "Racing",
            "Real Time Strategy (RTS)",
            "Role-playing (RPG)",
            "Shooter",
            "Simulator",
            "Sport",
            "Strategy",
            "Tactical",
            "Turn-based strategy (TBS)",
            "Visual Novel"
        ]);

        setAvailablePlatforms([
            "3DS",
            "GameCube",
            "Google Stadia",
            "Mac",
            "Nintendo Switch",
            "PC",
            "PlayStation 2",
            "PlayStation 3",
            "PlayStation 4",
            "PlayStation 5",
            "SNES",
            "Wii U",
            "Xbox 360",
            "Xbox One",
            "Xbox Series X|S"
        ]);
    };

    useEffect(() => {
        setPage(1); // Reset to page 1 when filters change
    }, [minRating, selectedGenres, selectedPlatforms]);

    useEffect(() => {
        fetchGames();
    }, [page, minRating, selectedGenres, selectedPlatforms]);

    const fetchGames = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: ITEMS_PER_PAGE.toString(),
            });

            if (minRating) {
                params.append("min_rating", minRating);
            }

            if (selectedGenres.length > 0) {
                params.append("genres", selectedGenres.join(","));
            }

            if (selectedPlatforms.length > 0) {
                params.append("platforms", selectedPlatforms.join(","));
            }

            const url = `${API_URL}/games/filter?${params.toString()}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Error fetching games");
            const data: ApiResponse = await res.json();
            setGames(data.data);
            setTotalPages(data.meta.total_pages);
            setTotalItems(data.meta.total_items);
        } catch (error) {
            console.error("Failed to fetch games:", error);
            setGames([]);
            setTotalPages(1);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    };

    const toggleGenre = (genre: string) => {
        setSelectedGenres(prev =>
            prev.includes(genre)
                ? prev.filter(g => g !== genre)
                : [...prev, genre]
        );
    };

    const togglePlatform = (platform: string) => {
        setSelectedPlatforms(prev =>
            prev.includes(platform)
                ? prev.filter(p => p !== platform)
                : [...prev, platform]
        );
    };

    const clearFilters = () => {
        setMinRating("20");
        setSelectedGenres([]);
        setSelectedPlatforms([]);
    };

    const activeFiltersCount =
        (minRating !== "20" ? 1 : 0) +
        selectedGenres.length +
        selectedPlatforms.length;

    const handleGameClick = async (gameId: number) => {
        setModalLoading(true);
        setShowModal(true);
        setRentalMessage("");
        setRentalError("");

        try {
            const res = await fetch(`${API_URL}/games/${gameId}`);
            if (!res.ok) throw new Error("Failed to fetch game details");
            const data: GameDetails = await res.json();
            setSelectedGame(data);
        } catch (error) {
            console.error("Error fetching game details:", error);
            setRentalError("Nie udało się pobrać szczegółów gry");
        } finally {
            setModalLoading(false);
        }
    };

    const handleRentGame = async (inventoryId: number) => {
        const token = getToken();
        if (!token) {
            router.push("/login");
            return;
        }

        setRentalMessage("");
        setRentalError("");

        try {
            const res = await fetch(`${API_URL}/rent`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ inventory_id: inventoryId }),
            });

            const data = await res.json();

            if (res.ok) {
                setRentalMessage("Gra wypożyczona pomyślnie!");
                // Refresh game details to update inventory
                if (selectedGame) {
                    const refreshRes = await fetch(`${API_URL}/games/${selectedGame.id}`);
                    if (refreshRes.ok) {
                        const refreshedData: GameDetails = await refreshRes.json();
                        setSelectedGame(refreshedData);
                    }
                }
            } else {
                setRentalError(data.error || "Błąd wypożyczenia gry");
            }
        } catch {
            setRentalError("Błąd połączenia z serwerem");
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedGame(null);
        setRentalMessage("");
        setRentalError("");
    };

    const parseScreenshots = (screenshotsStr: string): string[] => {
        if (!screenshotsStr) return [];
        return screenshotsStr.split(",");
    };

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

                <div className={styles.navButtons}>
                    <button onClick={() => router.push("/new")}>
                        Nowe gry
                    </button>

                    <button onClick={() => router.push("/randomgame")}>
                        Losowa gra
                    </button>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`${styles.filterToggleButton} ${activeFiltersCount > 0 ? styles.filterToggleButtonActive : ''}`}
                    >
                        Filtry {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                    </button>
                </div>

                <button
                    onClick={() => router.push(isLoggedIn ? "/profile" : "/login")}
                    className={styles.loginButton}
                >
                    {isLoggedIn ? "Profil" : "Login"}
                </button>
            </div>

            <div className={styles.dashboardContainer}>
                <h1>Game Library</h1>
                <p style={{ color: "#666", marginTop: "0.5rem" }}>
                    Wyświetlono {games.length} z {totalItems} gier
                </p>

                {showFilters && (
                    <div className={styles.filterContainer}>
                        <div className={styles.filterHeader}>
                            <h3>Filtry</h3>
                            <button
                                onClick={clearFilters}
                                className={styles.clearButton}
                            >
                                Wyczyść filtry
                            </button>
                        </div>

                        {/* Min Rating Filter */}
                        <div className={styles.filterSection}>
                            <label className={styles.filterLabel}>
                                Minimalna liczba ocen: <span className={styles.filterValue}>{minRating}</span>
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="10"
                                value={minRating}
                                onChange={(e) => setMinRating(e.target.value)}
                                className={styles.slider}
                            />
                            <div className={styles.sliderLabels}>
                                <span>0</span>
                                <span>50</span>
                                <span>100</span>
                            </div>
                        </div>

                        {/* Genres Filter */}
                        <div className={styles.filterSection}>
                            <h4 className={styles.filterSubtitle}>
                                Gatunki <span className={styles.selectedCount}>({selectedGenres.length})</span>
                            </h4>
                            <div className={styles.filterButtonsScrollable}>
                                {availableGenres.map(genre => (
                                    <button
                                        key={genre}
                                        onClick={() => toggleGenre(genre)}
                                        className={`${styles.filterButton} ${selectedGenres.includes(genre) ? styles.filterButtonActive : ''}`}
                                    >
                                        {genre}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Platforms Filter */}
                        <div className={styles.filterSection}>
                            <h4 className={styles.filterSubtitle}>
                                Platformy <span className={styles.selectedCount}>({selectedPlatforms.length})</span>
                            </h4>
                            <div className={styles.filterButtons}>
                                {availablePlatforms.map(platform => (
                                    <button
                                        key={platform}
                                        onClick={() => togglePlatform(platform)}
                                        className={`${styles.filterButton} ${styles.filterButtonPlatform} ${selectedPlatforms.includes(platform) ? styles.filterButtonPlatformActive : ''}`}
                                    >
                                        {platform}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <p>Loading...</p>
                ) : games.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "3rem", color: "#666" }}>
                        <p style={{ fontSize: "1.2rem" }}>Nie znaleziono gier spełniających kryteria</p>
                        <p>Spróbuj zmienić filtry</p>
                    </div>
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
                            {games.map((game) => (
                                <div
                                    key={game.id}
                                    onClick={() => {
                                        console.log("Clicking game:", game.id);
                                        handleGameClick(game.id);
                                    }}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        cursor: "pointer",
                                        transition: "transform 0.2s",
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
                                    <p style={{ fontSize: "0.9rem", color: "#666", marginTop: "0.25rem" }}>
                                        Rating: {game.rating.toFixed(1)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <div
                                style={{
                                    display: "flex",
                                    gap: "1rem",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    marginTop: "3rem",
                                }}
                            >
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        cursor: page === 1 ? "not-allowed" : "pointer",
                                        opacity: page === 1 ? 0.5 : 1,
                                    }}
                                >
                                    Previous
                                </button>
                                <span>
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        cursor: page >= totalPages ? "not-allowed" : "pointer",
                                        opacity: page >= totalPages ? 0.5 : 1,
                                    }}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Game Details Modal */}
            {showModal && (
                <div
                    className={styles.modalOverlay}
                    onClick={closeModal}
                >
                    <div
                        className={styles.modalContent}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {modalLoading ? (
                            <p>Ładowanie...</p>
                        ) : selectedGame ? (
                            <>
                                <button
                                    className={styles.closeButton}
                                    onClick={closeModal}
                                >
                                    ✕
                                </button>

                                <div className={styles.modalBody}>
                                    <div className={styles.modalHeader}>
                                        {selectedGame.artwork_url && (
                                            <img
                                                src={selectedGame.artwork_url}
                                                alt={selectedGame.title}
                                                className={styles.modalArtwork}
                                            />
                                        )}
                                        <div className={styles.modalHeaderInfo}>
                                            <h2>{selectedGame.title}</h2>
                                            {selectedGame.genres && (
                                                <p className={styles.genres}>
                                                    <strong>Gatunki:</strong> {selectedGame.genres}
                                                </p>
                                            )}
                                            <div className={styles.stats}>
                                                <span><strong>Ocena:</strong> {selectedGame.rating.toFixed(1)} / 100</span>
                                                <span><strong>Liczba ocen:</strong> {selectedGame.rating_count}</span>
                                                <span><strong>Data wydania:</strong> {new Date(selectedGame.release_date).toLocaleDateString("pl-PL")}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.description}>
                                        <h3>Opis</h3>
                                        <p>{selectedGame.description}</p>
                                    </div>

                                    {selectedGame.screenshots && parseScreenshots(selectedGame.screenshots).length > 0 && (
                                        <div className={styles.screenshots}>
                                            <h3>Zrzuty ekranu</h3>
                                            <div className={styles.screenshotsGrid}>
                                                {parseScreenshots(selectedGame.screenshots).slice(0, 6).map((screenshot, idx) => (
                                                    <img
                                                        key={idx}
                                                        src={screenshot}
                                                        alt={`Screenshot ${idx + 1}`}
                                                        className={styles.screenshot}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className={styles.inventory}>
                                        <h3>Dostępność do wypożyczenia</h3>
                                        {rentalMessage && (
                                            <div className={styles.rentalSuccess}>{rentalMessage}</div>
                                        )}
                                        {rentalError && (
                                            <div className={styles.rentalError}>{rentalError}</div>
                                        )}
                                        <div className={styles.inventoryGrid}>
                                            {selectedGame.inventory.map((inv) => (
                                                <div
                                                    key={inv.inventory_id}
                                                    className={`${styles.inventoryCard} ${inv.quantity > 0 ? styles.available : styles.unavailable
                                                        }`}
                                                >
                                                    <p className={styles.platformName}>{inv.platform_name}</p>
                                                    <p className={styles.quantity}>
                                                        {inv.quantity > 0 ? `${inv.quantity} szt.` : "Brak"}
                                                    </p>
                                                    {inv.quantity > 0 && (
                                                        isLoggedIn ? (
                                                            <button
                                                                onClick={() => handleRentGame(inv.inventory_id)}
                                                                className={styles.rentButton}
                                                            >
                                                                Wypożycz
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    closeModal();
                                                                    router.push("/login");
                                                                }}
                                                                className={styles.loginPromptButton}
                                                            >
                                                                Zaloguj się
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p>Nie udało się załadować szczegółów gry</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}