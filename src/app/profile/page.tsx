"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, removeToken } from "../../utils/auth";
import { API_URL } from "../../utils/config";
import styles from "../../styles/ProfilePage.module.css";
import Image from "next/image";
import Link from "next/link";

type UserData = {
    id: number;
    email: string;
    address: string;
    is_admin: boolean;
};

type Rental = {
    id: number;
    rented_at: string;
    return_date: string;
    actual_return_date: string | null;
    is_returned: boolean;
    title: string;
    artwork_url: string;
    platform_name: string;
};

export default function ProfilePage() {
    const router = useRouter();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Edit mode states
    const [isEditing, setIsEditing] = useState(false);
    const [newAddress, setNewAddress] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [updateSuccess, setUpdateSuccess] = useState("");
    const [updateError, setUpdateError] = useState("");

    useEffect(() => {
        const token = getToken();
        if (!token) {
            router.push("/login");
            return;
        }
        fetchUserData();
        fetchRentals();
    }, []);

    const fetchUserData = async () => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/users/me`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (res.ok) {
                const data = await res.json();
                setUserData(data);
                setNewAddress(data.address);
            } else {
                setError("Nie udało się pobrać danych użytkownika");
            }
        } catch {
            setError("Błąd połączenia z serwerem");
        } finally {
            setLoading(false);
        }
    };

    const fetchRentals = async () => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/rentals`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (res.ok) {
                const data = await res.json();
                setRentals(data);
            }
        } catch {
            console.error("Nie udało się pobrać wypożyczeń");
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdateError("");
        setUpdateSuccess("");

        const token = getToken();
        if (!token) return;

        const body: { address?: string; password?: string } = {};
        if (newAddress !== userData?.address) body.address = newAddress;
        if (newPassword) body.password = newPassword;

        if (Object.keys(body).length === 0) {
            setUpdateError("Nie wprowadzono żadnych zmian");
            return;
        }

        try {
            const res = await fetch(`${API_URL}/auth/change`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (res.ok) {
                setUpdateSuccess(data.message || "Dane zaktualizowane pomyślnie");
                setNewPassword("");
                setIsEditing(false);
                fetchUserData();
            } else {
                setUpdateError(data.error || "Błąd aktualizacji danych");
            }
        } catch {
            setUpdateError("Błąd połączenia z serwerem");
        }
    };

    const handleReturnGame = async (rentalId: number) => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_URL}/rent/${rentalId}/return`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await res.json();

            if (res.ok) {
                alert(data.message || "Gra zwrócona pomyślnie");
                fetchRentals();
            } else {
                alert(data.error || "Błąd zwrotu gry");
            }
        } catch {
            alert("Błąd połączenia z serwerem");
        }
    };

    const handleLogout = () => {
        removeToken();
        localStorage.removeItem("userRole");
        router.push("/");
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("pl-PL", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <p>Ładowanie...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <p className={styles.error}>{error}</p>
            </div>
        );
    }

    return (
        <div>
            <div className={styles.topBar}>
                <Link href="/">
                    <Image
                        src="/images/logo.png"
                        alt="Logo"
                        width={100}
                        height={100}
                        priority
                    />
                </Link>
                <h1>Profil Użytkownika</h1>
                <button onClick={handleLogout} className={styles.logoutButton}>
                    Wyloguj
                </button>
            </div>

            <div className={styles.container}>
                <div className={styles.profileSection}>
                    <h2>Dane Konta</h2>
                    {userData && (
                        <div className={styles.userInfo}>
                            <div className={styles.infoRow}>
                                <strong>Email:</strong> {userData.email}
                            </div>
                            <div className={styles.infoRow}>
                                <strong>Rola:</strong> {userData.is_admin ? "Administrator" : "Użytkownik"}
                            </div>

                            {!isEditing ? (
                                <>
                                    <div className={styles.infoRow}>
                                        <strong>Adres:</strong> {userData.address}
                                    </div>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className={styles.editButton}
                                    >
                                        Edytuj dane
                                    </button>
                                </>
                            ) : (
                                <form onSubmit={handleUpdate} className={styles.editForm}>
                                    <div className={styles.formGroup}>
                                        <label>Nowy adres:</label>
                                        <input
                                            type="text"
                                            value={newAddress}
                                            onChange={(e) => setNewAddress(e.target.value)}
                                            placeholder="ul. Prosta 1, Warszawa"
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Nowe hasło (opcjonalne):</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Zostaw puste, aby nie zmieniać"
                                        />
                                    </div>
                                    {updateError && <p className={styles.error}>{updateError}</p>}
                                    {updateSuccess && <p className={styles.success}>{updateSuccess}</p>}
                                    <div className={styles.buttonGroup}>
                                        <button type="submit" className={styles.saveButton}>
                                            Zapisz
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditing(false);
                                                setNewAddress(userData.address);
                                                setNewPassword("");
                                                setUpdateError("");
                                                setUpdateSuccess("");
                                            }}
                                            className={styles.cancelButton}
                                        >
                                            Anuluj
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.rentalsSection}>
                    <h2>Historia Wypożyczeń</h2>
                    {rentals.length === 0 ? (
                        <p className={styles.noRentals}>Brak wypożyczeń</p>
                    ) : (
                        <div className={styles.rentalsList}>
                            {rentals.map((rental) => (
                                <div
                                    key={rental.id}
                                    className={`${styles.rentalCard} ${rental.is_returned ? styles.returned : styles.active
                                        }`}
                                >
                                    <img
                                        src={rental.artwork_url}
                                        alt={rental.title}
                                        className={styles.gameArtwork}
                                    />
                                    <div className={styles.rentalInfo}>
                                        <h3>{rental.title}</h3>
                                        <p className={styles.platform}>{rental.platform_name}</p>
                                        <div className={styles.dates}>
                                            <p>
                                                <strong>Data wypożyczenia:</strong>{" "}
                                                {formatDate(rental.rented_at)}
                                            </p>
                                            <p>
                                                <strong>Termin zwrotu:</strong>{" "}
                                                {formatDate(rental.return_date)}
                                            </p>
                                            {rental.actual_return_date && (
                                                <p>
                                                    <strong>Faktyczny zwrot:</strong>{" "}
                                                    {formatDate(rental.actual_return_date)}
                                                </p>
                                            )}
                                        </div>
                                        <div className={styles.statusBadge}>
                                            {rental.is_returned ? (
                                                <span className={styles.returnedBadge}>Zwrócono</span>
                                            ) : (
                                                <>
                                                    <span className={styles.activeBadge}>Aktywne</span>
                                                    <button
                                                        onClick={() => handleReturnGame(rental.id)}
                                                        className={styles.returnButton}
                                                    >
                                                        Zwróć grę
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}