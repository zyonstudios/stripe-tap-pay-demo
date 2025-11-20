// app/_layout.tsx
import { Stack } from "expo-router";
import React from "react";

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

// // app/_layout.tsx
// import React, { useEffect, useState } from "react";
// import { Stack, Redirect } from "expo-router";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { StripeTerminalProvider } from "@stripe/stripe-terminal-react-native";

// const BACKEND_URL = "https://joelsapos.com/taptopay";

// export default function RootLayout() {
//   const [loading, setLoading] = useState(true);
//   const [accountId, setAccountId] = useState<string | null>(null);

//   useEffect(() => {
//     async function load() {
//       const id = await AsyncStorage.getItem("stripe_account_id");
//       setAccountId(id);
//       setLoading(false);
//     }
//     load();
//   }, []);

//   if (loading) return null;

//   // ❗ If user has NO account → send to signup
//   if (!accountId) {
//     return <Redirect href="/signup" />;
//   }

//   // ✔ User has account → load Stripe + Tabs
//   const fetchToken = async () => {
//     const res = await fetch(`${BACKEND_URL}/connection_token.php`, { method: "POST" });
//     const json = await res.json();
//     return json.secret;
//   };

//   return (
//     <StripeTerminalProvider tokenProvider={fetchToken}>
//       <Stack screenOptions={{ headerShown: false }} />
//     </StripeTerminalProvider>
//   );
// }

