"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { insforge } from "../app/lib/insforge";

interface AuthContextType {
	user: any | null;
	loading: boolean;
	signOut: () => Promise<void>;
	setUser: React.Dispatch<React.SetStateAction<any | null>>;
	syncUser: (user: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<any | null>(null);
	const [loading, setLoading] = useState(true);

	// Sync user information to database and update login timestamps/metadata
	const syncUser = async (currentUser: any) => {
		if (!currentUser) return;
		try {
			const { data, error } = await insforge.database
				.from("users")
				.select("*")
				.eq("id", currentUser.id)
				.maybeSingle();

			if (error) {
				console.error("Error checking user in DB:", error);
				return;
			}

			const now = new Date().toISOString();

			// Determine login provider
			let providerName = "email";
			if (
				currentUser.providers?.includes("google") ||
				currentUser.email?.endsWith("@gmail.com")
			) {
				providerName = "google";
			}

			if (!data) {
				// User does not exist, insert their profile data
				const { error: insertError } = await insforge.database
					.from("users")
					.insert({
						id: currentUser.id,
						email: currentUser.email,
						name: currentUser.profile?.name || currentUser.email.split("@")[0],
						avatar_url: currentUser.profile?.avatar_url || "",
						provider: providerName,
						last_login_at: now,
					});

				if (insertError) {
					console.error("Error inserting user to DB:", insertError);
				} else {
					console.log("User profile synchronized to DB.");
				}
			} else {
				// User exists, update last login and other metadata
				const { error: updateError } = await insforge.database
					.from("users")
					.update({
						last_login_at: now,
						updated_at: now,
						provider: providerName,
					})
					.eq("id", currentUser.id);

				if (updateError) {
					console.error("Error updating user in DB:", updateError);
				} else {
					console.log("User session sync/last login updated in DB.");
				}
			}
		} catch (err) {
			console.error("Sync failed:", err);
		}
	};

	useEffect(() => {
		const fetchSession = async () => {
			try {
				const { data } = await insforge.auth.getCurrentUser();
				if (data?.user) {
					setUser(data.user);
					await syncUser(data.user);
				}
			} catch (err) {
				console.error("Session initialization error:", err);
			} finally {
				setLoading(false);
			}
		};
		fetchSession();
	}, []);

	const signOut = async () => {
		await insforge.auth.signOut();
		setUser(null);
	};

	return (
		<AuthContext.Provider value={{ user, loading, signOut, setUser, syncUser }}>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
