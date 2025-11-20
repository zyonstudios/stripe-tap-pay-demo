import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, TextInput, Button, Alert, Platform } from "react-native";
import {
  StripeTerminalProvider,
  useStripeTerminal,
  requestNeededAndroidPermissions,  
} from "@stripe/stripe-terminal-react-native";

const BACKEND_URL = "https://cafe.joelsa.co.uk/taptopay";

export default function Index() {
  const fetchConnectionToken = async (): Promise<string> => {
    const response = await fetch(`${BACKEND_URL}/connection_token.php`, { method: "POST" });
    const data = await response.json();
    return data.secret;
  };

  return (
    <StripeTerminalProvider tokenProvider={fetchConnectionToken} logLevel="verbose">
      <PaymentScreen />
    </StripeTerminalProvider>
  );
}

function PaymentScreen() {
  const [showInput, setShowInput] = useState(false);
  const [amount, setAmount] = useState("");
 const [connectedReader, setConnectedReader] = useState<any>(null);
const [discoveredReaders, setDiscoveredReaders] = useState<any[]>([]);

// 👇 Add "as any" here to bypass incomplete Stripe typings
const {
  initialize,
  discoverReaders,
  connectReader,
  collectPaymentMethod,
  processPayment,
} = useStripeTerminal({
  onUpdateDiscoveredReaders: (readers) => {
    console.log("Discovered readers:", readers);
    setDiscoveredReaders(readers);
  },
  onDidDisconnect: () => {
    Alert.alert("Reader disconnected", "Please reconnect before accepting payments.");
    setConnectedReader(null);
  },
}) as any;


  // --- Request permissions + Initialize SDK ---
  useEffect(() => {
    async function setup() {
      if (Platform.OS === "android") {
        await requestNeededAndroidPermissions({
          accessFineLocation: {
            title: "Location Permission",
            message: "Stripe Terminal needs access to your location",
            buttonPositive: "Accept",
          },
        });
      }
      const { error } = await initialize();
      if (error) Alert.alert("Stripe Init Error", error.message);
      else console.log("✅ Stripe Terminal initialized");
    }
    setup();
  }, [initialize]);

  // --- Discover Tap-to-Pay Readers ---
  const handleDiscoverReaders = async () => {
    const { error } = await discoverReaders({ discoveryMethod: "tapToPay" });
    if (error) Alert.alert("Discovery Error", error.message);
  };

  // --- Connect to the first discovered reader ---
  const handleConnectReader = async () => {
    if (discoveredReaders.length === 0) {
      Alert.alert("No readers found", "Try discovering readers first.");
      return;
    }
    const selected = discoveredReaders[0];
    const { reader, error } = await connectReader(
      { reader: selected, locationId: "{{tml_GQKD2ABQvBK5zA}}", autoReconnectOnUnexpectedDisconnect: true },
      "tapToPay"
    );
    if (error) Alert.alert("Connection Error", error.message);
    else {
      Alert.alert("✅ Reader Connected", `Connected to ${reader.label || reader.serialNumber}`);
      setConnectedReader(reader);
    }
  };

  // --- Payment flow ---
  const handleContinue = async () => {
    try {
      if (!connectedReader) {
        Alert.alert("No reader connected", "Connect to a reader first.");
        return;
      }
      const amountInCents = Math.round(parseFloat(amount) * 100);

      // 1️⃣ Create PaymentIntent
      const res = await fetch(`${BACKEND_URL}/create_payment_intent.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountInCents, currency: "gbp" }),
      });
      const { client_secret } = await res.json();

      // 2️⃣ Collect and process payment
      const collectResult = await collectPaymentMethod(client_secret);
      if (collectResult.error) throw new Error(collectResult.error.message);
      const processResult = await processPayment(collectResult.paymentIntentId);
      if (processResult.error) throw new Error(processResult.error.message);

      // 3️⃣ Capture the payment
      await fetch(`${BACKEND_URL}/capture_payment_intent.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_intent_id: collectResult.paymentIntentId }),
      });

      Alert.alert("✅ Payment Successful", `£${amount} captured successfully!`);
      setAmount("");
      setShowInput(false);
    } catch (err: any) {
      Alert.alert("❌ Payment Failed", err.message ?? "Something went wrong");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Stripe Tap-to-Pay Demo</Text>

      {!connectedReader ? (
        <View>
          <Button title="Discover Readers" onPress={handleDiscoverReaders} />
          {discoveredReaders.length > 0 && (
            <Button title="Connect to Reader" onPress={handleConnectReader} />
          )}
        </View>
      ) : !showInput ? (
        <Button title="Pay Now" onPress={() => setShowInput(true)} />
      ) : (
        <View style={styles.paymentBox}>
          <Text style={styles.label}>Enter Amount (£)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="10.00"
            value={amount}
            onChangeText={setAmount}
          />
          <Button title="Continue to Payment" onPress={handleContinue} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16, backgroundColor: "#f8f8f8" },
  header: { fontSize: 20, fontWeight: "600", marginBottom: 20 },
  paymentBox: { backgroundColor: "#fff", padding: 20, borderRadius: 12, width: "80%", elevation: 3 },
  label: { fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 10, marginBottom: 15, fontSize: 16 },
});
