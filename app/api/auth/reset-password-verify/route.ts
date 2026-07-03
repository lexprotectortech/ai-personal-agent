import { NextResponse } from "next/server";
import { insforge } from "../../../lib/insforge";

export async function POST(request: Request) {
	try {
		const { email, code } = await request.json();

		if (!email || !code) {
			return NextResponse.json(
				{ error: "Missing email or code." },
				{ status: 400 },
			);
		}

		// Exchange the email code for a server-side token
		const { data, error } = await insforge.auth.exchangeResetPasswordToken({
			email: email.trim(),
			code: code.trim(),
		});

		if (error || !data) {
			return NextResponse.json(
				{ error: "Invalid or expired verification code." },
				{ status: 400 },
			);
		}

		// Return the token to the client for use in resetPassword
		return NextResponse.json({
			token: data.token,
			expiresAt: data.expiresAt,
		});
	} catch {
		return NextResponse.json(
			{ error: "An unexpected error occurred." },
			{ status: 500 },
		);
	}
}
