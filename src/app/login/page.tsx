"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, setToken, saveLoginCredentials } from "../../utils/auth";
import { API_URL } from "../../utils/config";
import styles from "../../styles/LoginPage.module.css";
import Image from "next/image";

declare global {
    interface Window {
        __refreshTokenInterval?: ReturnType<typeof setInterval>;
    }
}

export default function LoginPage() {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [address, setAddress] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const router = useRouter();

    useEffect(() => {
        const token = getToken();
        const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
        if (token && role === "0") {
            router.push("/");
        } else if (token) {
            router.push("/");
        }
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok && data.token) {
                setToken(data.token);
                if (data.user && typeof data.user.is_admin !== "undefined") {
                    localStorage.setItem("userRole", data.user.is_admin ? "0" : "1");
                }
                // Save credentials for auto-login
                saveLoginCredentials(email, password);

                router.push("/");
            } else {
                setError(data.error || "Nieprawidłowy email lub hasło.");
            }
        } catch {
            setError("Błąd logowania. Spróbuj ponownie.");
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!address.trim()) {
            setError("Adres jest wymagany.");
            return;
        }

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password, address })
            });
            const data = await res.json();

            if (res.ok) {
                setSuccess("Konto zostało utworzone! Możesz się teraz zalogować.");
                // Clear form
                setEmail("");
                setPassword("");
                setAddress("");
                // Switch to login mode after 2 seconds
                setTimeout(() => {
                    setIsRegistering(false);
                    setSuccess("");
                }, 2000);
            } else {
                setError(data.error || "Błąd rejestracji. Sprawdź dane i spróbuj ponownie.");
            }
        } catch {
            setError("Błąd rejestracji. Spróbuj ponownie.");
        }
    };

    const toggleMode = () => {
        setIsRegistering(!isRegistering);
        setError("");
        setSuccess("");
        setEmail("");
        setPassword("");
        setAddress("");
    };

    return (
        <div className={`${styles.loginContainer} ${isRegistering ? styles.registerMode : ''}`}>
            <form
                className={styles.loginBox}
                onSubmit={isRegistering ? handleRegister : handleLogin}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        marginBottom: "20px",
                    }}
                >
                    <Image
                        src="/images/logo.png"
                        alt="Logo"
                        width={100}
                        height={100}
                        priority
                    />
                </div>

                <h2>{isRegistering ? "Zarejestruj się" : "Zaloguj się"}</h2>

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    required
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Hasło"
                    value={password}
                    required
                    onChange={(e) => setPassword(e.target.value)}
                />

                {isRegistering && (
                    <input
                        type="text"
                        placeholder="Adres (np. ul. Prosta 1, Warszawa)"
                        value={address}
                        required
                        onChange={(e) => setAddress(e.target.value)}
                    />
                )}

                {error && <div className={styles.error}>{error}</div>}
                {success && <div className={styles.success}>{success}</div>}

                <button type="submit">
                    {isRegistering ? "Zarejestruj" : "Zaloguj"}
                </button>

                <div className={styles.toggleMode}>
                    <span>
                        {isRegistering ? "Masz już konto?" : "Nie masz konta?"}
                    </span>
                    <button
                        type="button"
                        onClick={toggleMode}
                        className={styles.toggleButton}
                    >
                        {isRegistering ? "Zaloguj się" : "Zarejestruj się"}
                    </button>
                </div>
            </form>
        </div>
    );
}