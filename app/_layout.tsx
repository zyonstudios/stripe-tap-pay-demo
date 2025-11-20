// app/_layout.tsx
import React from "react";
import { Stack } from "expo-router";
import { StripeTerminalProvider } from "@stripe/stripe-terminal-react-native";

const BACKEND_URL = "https://cafe.joelsa.co.uk/taptopay";

export default function RootLayout() {
  const fetchConnectionToken = async (): Promise<string> => {
    const res = await fetch(`${BACKEND_URL}/connection_token.php`, { method: "POST" });
    const data = await res.json();
    if (!data?.secret) throw new Error("No connection token returned");
    return data.secret;
  };

  return (
    <StripeTerminalProvider tokenProvider={fetchConnectionToken}>
      <Stack screenOptions={{ headerShown: false }} />
    </StripeTerminalProvider>
  );
}
