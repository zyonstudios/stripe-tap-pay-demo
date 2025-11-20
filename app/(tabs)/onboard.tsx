import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Button,
  Text,
  View,
  TextInput,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

const BACKEND_URL = "https://joelsapos.com/taptopay";

export default function OnboardScreen() {
  const router = useRouter();

  const [merchantId, setMerchantId] = useState<string | null>(null);

  const [loadingOnboarding, setLoadingOnboarding] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [needsLocation, setNeedsLocation] = useState(false);

  const [terminalLocationId, setTerminalLocationId] = useState<string | null>(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [showLocationSuccess, setShowLocationSuccess] = useState(false);

  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("GB");
  const [registering, setRegistering] = useState(false);

  // ----------------------------------------------------
  // Always check Stripe status whenever the screen opens
  // ----------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      async function load() {
        const id = await AsyncStorage.getItem("merchant_id");
        setMerchantId(id);
        if (id) checkStatus(id);

        const deviceCountry =
          Localization.region?.toUpperCase() ??
          Localization.locale?.split("-")[1]?.toUpperCase() ??
          "GB";

        setCountry(deviceCountry); // autofill

      }
      load();
      return () => { };
    }, [])
  );

  // ----------------------------------------------------
  // Check onboarding + location
  // ----------------------------------------------------
  const checkStatus = async (merchant_id: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/check_onboarding_status.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id }),
      });

      const data = await res.json();
      console.log("📌 Check Status:", data);

      const completed = data.onboarding_complete === true;
      setOnboardingComplete(completed);

      if (completed) {
        await AsyncStorage.setItem("onboarding_complete", "true");

        if (data.terminal_location_id) {
          setTerminalLocationId(data.terminal_location_id);
          await AsyncStorage.setItem("terminal_location_id", data.terminal_location_id);

          setShowSuccess(true); // Show onboarding complete UI
          setShowLocationSuccess(true); // Since location exists, show location success too
        } else {
          setShowSuccess(true); // Show onboarding success UI
          setNeedsLocation(true); // Location needs registration
        }
      }
    } catch (err) {
      console.log("❌ Error checking status:", err);
    }
  };

  // ----------------------------------------------------
  // Start Stripe onboarding
  // ----------------------------------------------------
  const startOnboarding = async () => {
    try {
      setLoadingOnboarding(true);

      const merchant_id = await AsyncStorage.getItem("merchant_id");
      if (!merchant_id) return;

      const res = await fetch(`${BACKEND_URL}/create_onboarding_link.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id }),
      });

      const data = await res.json();
      setLoadingOnboarding(false);

      if (data.error) {
        Alert.alert("Error", data.error);
        return;
      }

      await WebBrowser.openBrowserAsync(data.url);

      // Recheck shortly after browser closes
      setTimeout(() => checkStatus(merchant_id), 800);

    } catch (err) {
      Alert.alert("Error", "Unable to open Stripe onboarding");
      setLoadingOnboarding(false);
    }
  };

  // ----------------------------------------------------
  // Register Terminal Location
  // ----------------------------------------------------
  const registerLocation = async () => {
    if (!addressLine1 || !city || !postalCode) {
      Alert.alert("Missing fields", "Please complete all address fields.");
      return;
    }

    setRegistering(true);

    const res = await fetch(`${BACKEND_URL}/create_terminal_location.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId,
        address: {
          line1: addressLine1,
          city: city,
          postal_code: postalCode,
          country: country,
        },
      }),
    });

    const data = await res.json();
    setRegistering(false);

    if (data.error) {
      Alert.alert("Error", data.error);
      return;
    }

    await AsyncStorage.setItem("terminal_location_id", data.location_id);
    setTerminalLocationId(data.location_id);

    setShowLocationSuccess(true); // show success screen
  };

  // ----------------------------------------------------
  // SHOW “ONBOARDING COMPLETE” (NO LOCATION YET)
  // ----------------------------------------------------
  if (showSuccess && !showLocationSuccess) {
    return (
      <View style={styles.centerScreen}>
        <Ionicons name="checkmark-circle" size={90} color="#10B981" />
        <Text style={styles.bigTitle}>Onboarding Complete!</Text>

        <Text style={styles.infoText}>
          Your Stripe account is ready. Please register your payment terminal location.
        </Text>

        <TouchableOpacity
          onPress={() => setNeedsLocation(true)}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Register Location</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ----------------------------------------------------
  // SHOW “LOCATION REGISTERED” SUCCESS UI
  // ----------------------------------------------------
  if (showSuccess && showLocationSuccess) {
    return (
      <View style={styles.centerScreen}>
        <Ionicons name="location" size={90} color="#2563EB" />
        <Text style={styles.bigTitle}>Location Registered</Text>

        <Text style={styles.infoText}>Terminal Location ID:</Text>

        <Text style={styles.locationIdText}>{terminalLocationId}</Text>

        <TouchableOpacity
          onPress={() => router.replace("/(tabs)")}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Continue to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ----------------------------------------------------
  // SHOW LOCATION REGISTRATION FORM
  // ----------------------------------------------------
  if (onboardingComplete && needsLocation) {
    return (
      <View style={{ padding: 20, marginTop: 80 }}>
        <Text style={styles.title}>Register Business Location</Text>

        <Text>Address Line 1</Text>
        <TextInput style={styles.input} value={addressLine1} onChangeText={setAddressLine1} />

        <Text>City</Text>
        <TextInput style={styles.input} value={city} onChangeText={setCity} />

        <Text>Postcode</Text>
        <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} />

        <Text>Country</Text>
        <TextInput
          style={[styles.input, { backgroundColor: "#f0f0f0", opacity: 0.6 }]}
          value={country}
          editable={false}
        />


        <TouchableOpacity
          style={styles.registerButton}
          onPress={registerLocation}
          disabled={registering}
        >
          <Text style={styles.registerButtonText}>
            {registering ? "Registering..." : "Register Location"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ----------------------------------------------------
  // STILL CHECKING…
  // ----------------------------------------------------
  if (onboardingComplete === null) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" />
        <Text>Checking your account…</Text>
      </View>
    );
  }

  // ----------------------------------------------------
  // ONBOARDING NOT COMPLETE
  // ----------------------------------------------------
  return (
    <View style={{ padding: 20, marginTop: 80 }}>
      <Text style={styles.title}>Finish your Stripe onboarding</Text>

      <Text style={{ color: "blue" }}>Merchant ID: {merchantId ?? "No ID"}</Text>

      {loadingOnboarding ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button title="Open Stripe Onboarding" onPress={startOnboarding} />
      )}

      {/* Help Button */}
      <TouchableOpacity
        onPress={() => setHelpVisible(true)}
        style={{ marginTop: 20, alignSelf: "center" }}
      >
        <Ionicons name="help-circle-outline" size={40} color="#007AFF" />
      </TouchableOpacity>

      {/* Help Modal */}
      <Modal visible={helpVisible} animationType="fade" transparent>
        <View style={styles.modalWrapper}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setHelpVisible(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>

            <ScrollView style={{ padding: 20 }}>
              <Text style={styles.modalTitle}>How Stripe Onboarding Works</Text>
              <Text style={styles.modalText}>
                Stripe onboarding connects your business so you can receive Tap-to-Pay payments.
              </Text>
              <Text style={styles.modalText}>
                You’ll verify identity, business details, and connect your bank account.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ----------------------------------------------------
// STYLES
// ----------------------------------------------------
const styles = StyleSheet.create({
  bigTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 20,
    textAlign: "center",
  },
  infoText: {
    fontSize: 16,
    marginTop: 15,
    textAlign: "center",
    color: "#6B7280",
  },
  locationIdText: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 10,
    color: "#111",
  },
  primaryButton: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginTop: 30,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  centerScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  registerButton: {
    backgroundColor: "#111827",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  registerButtonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  modalWrapper: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 10,
  },
  modalContainer: {
    backgroundColor: "white",
    height: "90%",
    borderRadius: 12,
  },
  modalClose: {
    alignSelf: "flex-end",
    padding: 12,
    backgroundColor: "#eee",
    borderBottomLeftRadius: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 12,
  },
});

