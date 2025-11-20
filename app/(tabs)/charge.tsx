import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Button,
  Alert,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Image
} from "react-native";
import {
  StripeTerminalProvider,
  useStripeTerminal,
  requestNeededAndroidPermissions,
} from "@stripe/stripe-terminal-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { blue } from "react-native-reanimated/lib/typescript/Colors";

const BACKEND_URL = "https://joelsapos.com/taptopay";

export default function ChargePage() {
  const router = useRouter();

  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);


  useEffect(() => {
    async function checkStatus() {
      const merchantId = await AsyncStorage.getItem("merchant_id");

      if (!merchantId) {
        setOnboardingComplete(false);
        setCheckingOnboarding(false);
        return;
      }

      const res = await fetch(`${BACKEND_URL}/check_onboarding_status.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: merchantId }),
      });

      const data = await res.json();
      console.log("📌 Onboarding check:", data);

      setOnboardingComplete(data.onboarding_complete === true);

      // Save location ID (or null)
      if (data.terminal_location_id) {
        await AsyncStorage.setItem("terminal_location_id", data.terminal_location_id);
      } else {
        await AsyncStorage.removeItem("terminal_location_id");
      }

      setCheckingOnboarding(false);
    }

    checkStatus();
  }, []);

  if (checkingOnboarding) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" />
        <Text>Checking onboarding…</Text>
      </View>
    );
  }

  if (!onboardingComplete) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.notReadyText}>Stripe onboarding not completed</Text>

        <TouchableOpacity
          style={styles.onboardButton}
          onPress={() => router.push("/onboard")}
        >
          <Text style={styles.onboardButtonText}>Complete Stripe Onboarding</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <StripeTerminalProvider tokenProvider={fetchConnectionToken} logLevel="verbose">
      <PaymentScreen />
    </StripeTerminalProvider>
  );
}

const fetchConnectionToken = async () => {
  const merchantId = await AsyncStorage.getItem("merchant_id");

  const response = await fetch(`${BACKEND_URL}/connection_token.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchant_id: merchantId }),
  });

  const data = await response.json();
  return data.secret;
};

/* -------------------------------------------------------
   PAYMENT SCREEN
-------------------------------------------------------- */

function PaymentScreen() {
  const [locationId, setLocationId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [connecting, setConnecting] = useState(true);
  const [connectedReader, setConnectedReader] = useState<any>(null);
  const [charging, setCharging] = useState(false);


  const {
    initialize,
    discoverReaders,
    connectReader,
    collectPaymentMethod,
    confirmPaymentIntent,
    retrievePaymentIntent,
  } = useStripeTerminal({
    onUpdateDiscoveredReaders: async (readers) => {
      if (readers.length > 0 && !connectedReader) {
        console.log("📌 Auto-connecting to reader:", readers[0]);
        await autoConnect(readers[0]);
      }
    },
    onDidDisconnect: () => {
      Alert.alert("Reader disconnected", "Reconnecting…");
      setConnectedReader(null);
      startAutoProcess(); // Try again
    },
  });

  // Load terminal location FIRST
  useEffect(() => {
    async function loadLocation() {
      const saved = await AsyncStorage.getItem("terminal_location_id");
      console.log("📌 Terminal Location Loaded:", saved);
      setLocationId(saved);
    }
    loadLocation();
  }, []);

  // Start full automatic terminal process
  useEffect(() => {
    if (locationId) startAutoProcess();
  }, [locationId]);

  const startAutoProcess = async () => {
    setConnecting(true);

    // 1️⃣ Ask Android for permissions
    if (Platform.OS === "android") {
      await requestNeededAndroidPermissions({
        accessFineLocation: {
          title: "Location Permission Required",
          message: "Needed for Tap to Pay.",
          buttonPositive: "OK",
        },
      });
    }

    // 2️⃣ Initialize Terminal
    console.log("⚡ Initializing Terminal...");
    const { error: initErr } = await initialize();
    if (initErr) {
      Alert.alert("Init Error", initErr.message);
      return;
    }

    // 3️⃣ Discover Readers
    console.log("🔍 Discovering readers…");
    const { error: discoverErr } = await discoverReaders({
      discoveryMethod: "tapToPay",
      simulated: __DEV__,
    });

    if (discoverErr) {
      Alert.alert("Discovery Error", discoverErr.message);
      return;
    }
  };

  const autoConnect = async (reader: any) => {
    console.log("📡 Connecting to reader:", reader);

    const { reader: connected, error } = await connectReader(
      {
        reader,
        locationId: locationId!,
        autoReconnectOnUnexpectedDisconnect: true,
      },
      "tapToPay"
    );

    if (error) {
      Alert.alert("Connection Error", error.message);
      return;
    }

    console.log("✅ Connected to:", connected);
    setConnectedReader(connected);
    setConnecting(false);
  };

  // PAYMENT FLOW
  const handleCharge = async () => {

    if (charging) return; // prevent double click
    setCharging(true);

    try {
      if (!amount || isNaN(parseFloat(amount))) {
        throw new Error("Enter a valid amount");
      }

      const merchantId = await AsyncStorage.getItem("merchant_id");
      const amountInCents = Math.round(parseFloat(amount) * 100);

      // 1️⃣ CREATE PAYMENT INTENT (backend)
      const piRes = await fetch(`${BACKEND_URL}/create_payment_intent.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          amount: amountInCents,
        }),
      });

      const data = await piRes.json();
      const backendPI = data.payment_intent;

      if (!backendPI?.client_secret) {
        throw new Error("Failed to create payment intent");
      }

      // 2️⃣ RETRIEVE PAYMENT INTENT
      const retrieved = await retrievePaymentIntent(backendPI.client_secret);

      if (!retrieved?.paymentIntent) {
        throw new Error("Failed to retrieve payment intent");
      }

      let paymentIntent = retrieved.paymentIntent;

      // 3️⃣ COLLECT PAYMENT METHOD (tap card)
      const collect = await collectPaymentMethod({ paymentIntent });

      if (collect.error) {
        throw new Error(collect.error.message);
      }

      if (!collect.paymentIntent) {
        throw new Error("Payment method collection failed");
      }

      paymentIntent = collect.paymentIntent;

      // 4️⃣ CONFIRM PAYMENT
      const confirm = await confirmPaymentIntent({ paymentIntent });

      if (confirm.error) {
        throw new Error(confirm.error.message);
      }

      // 5️⃣ SUCCESS 🎉
      Alert.alert("Payment Success", `£${amount} charged.`);
      setAmount("");

    } catch (err: any) {
      Alert.alert("Payment Failed", err.message);

    } finally {
      // ALWAYS enable button again
      setCharging(false);
    }
  };

  // UI RENDER
  if (connecting) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Connecting to reader…</Text>
        <Text style={{ marginTop: 10 }}>Might take couple of minutes…</Text>
      </View>
    );
  }

  if (!connectedReader) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10 }}>Searching for readers…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* TapToPay Logo */}
<View style={{ alignItems: "center", marginBottom: 25 }}>
  <Image
    source={require("../../assets/taptopay.png")}
    style={{
      width: "40%",
      height: undefined,
      aspectRatio: 1, // keeps it square
    }}
    resizeMode="contain"
  />
</View>

      <View style={styles.paymentBox}>
  <Text style={styles.label}>Amount</Text>

  {/* <Text style={{
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 5,
  }}>
    {currencySymbol}
  </Text> */}

  <TextInput
    keyboardType="decimal-pad"
    placeholder="00.00"
    value={amount}
    onChangeText={setAmount}
    editable={!charging}
    style={{
      fontSize: 28,
      textAlign: "center",
      borderWidth: 1,
      padding: 15,
      borderRadius: 12,
      letterSpacing: 10,
      marginBottom: 20,
      backgroundColor: charging ? "#e5e7eb" : "white",
    }}
  />

  <TouchableOpacity
    disabled={charging}
    onPress={handleCharge}
    style={{
      backgroundColor: charging ? "#9CA3AF" : "#111827",
      paddingVertical: 15,
      borderRadius: 10,
      alignItems: "center",
    }}
  >
    {charging ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Text style={{ color: "white", fontSize: 18, fontWeight: "700" }}>
        Take Payment
      </Text>
    )}
  </TouchableOpacity>
</View>

    </View>
  );
}


/* -------------------------------------------------------
   STYLES
-------------------------------------------------------- */

const styles = StyleSheet.create({
  centerScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notReadyText: {
    fontSize: 18,
    marginBottom: 12,
  },
  onboardButton: {
    backgroundColor: "#111827",
    padding: 14,
    borderRadius: 10,
  },
  onboardButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  container: { flex: 1, justifyContent: "flex-start", alignItems: "center" },
  header: { fontSize: 22, fontWeight: "700", color: "#111827" },
  paymentBox: {
    marginTop: 30,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "100%",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 15,
    padding: 10,
    borderRadius: 6,
  },
  label: {
    fontSize: 16,
    marginBottom: 8
  }
});
