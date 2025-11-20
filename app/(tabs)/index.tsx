import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  Button,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { TextStyle } from "react-native";

const cardTitle: TextStyle = {
  fontSize: 20,
  fontWeight: "600",
  marginBottom: 6,
};



const BACKEND_URL = "https://joelsapos.com/taptopay";

export default function HomeScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingLogin, setCheckingLogin] = useState(true);
  const navigation = useNavigation();


  // Logged-in merchant state
  const [merchantId, setMerchantId] = useState<string | null>(null);

  // 👉 ADD GEAR ICON IN HEADER
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={{ marginRight: 15 }}
          onPress={() => router.push("/settings")}
        >
          <Ionicons name="settings-outline" size={26} color="black" />
        </TouchableOpacity>
      ),
      title: "TapToPay",
    });
  }, []);

  // Load logged-in state
  useEffect(() => {
    async function load() {
      const storedId = await AsyncStorage.getItem("merchant_id");
      console.log("📌 Merchant ID from storage:", storedId);
      setMerchantId(storedId);
      setCheckingLogin(false);
    }
    load();
  }, []);

  // -------------------------------
  // CREATE ACCOUNT HANDLER
  // -------------------------------
  const handleSignup = async () => {
    if (loading) return; // prevent multi-click
    setLoading(true);

    if (!email.includes("@")) {
      Alert.alert("Invalid email");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/create_connect_account.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.error) {
        Alert.alert("Signup Error", data.error);
        setLoading(false);
        return;
      }

      // Save to local storage
      await AsyncStorage.setItem("merchant_id", data.merchant_id);
      await AsyncStorage.setItem("stripe_account_id", data.account_id);
      await AsyncStorage.setItem("onboarding_complete", "false");

      router.replace("/onboard");
    } catch (e) {
      Alert.alert("Error", "Something went wrong.");
    }

    setLoading(false);
  };

  // -------------------------------
  // LOGGED-IN UI (DASHBOARD)
  // -------------------------------
  const LoggedInDashboard = () => (
    <View style={{ flex: 1, padding: 20 }}>
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

      {/* Navigation buttons */}
      <View>
        {/* Payments */}
        <TouchableOpacity
          onPress={() => router.push("/payments")}
          style={cardStyle}
        >
          <Text style={cardTitle}>Payments</Text>
          <Text style={cardDesc}>View customer payments & refunds</Text>
        </TouchableOpacity>

        {/* Charge Screen */}
        <TouchableOpacity
          onPress={() => router.push("/charge")}
          style={cardStyle}
        >
          <Text style={cardTitle}>Charge Customer</Text>
          <Text style={cardDesc}>Tap-to-Pay instant card charge</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // -------------------------------
  // LOGGED OUT UI (SIGNUP SCREEN)
  // -------------------------------
  const SignupUI = () => (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <View style={{ alignItems: "center", marginBottom: 40 }}>
        <Image
          source={{
            uri: "https://cdn-icons-png.flaticon.com/512/891/891407.png",
          }}
          style={{ width: 100, height: 100, marginBottom: 15 }}
        />
        <Text style={{ fontSize: 30, fontWeight: "700" }}>TapToPay</Text>
      </View>

      <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 20, textAlign: "center" }}>
        Create your account
      </Text>
      

      <TextInput
        placeholder="Your Email"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          borderColor: "#D1D5DB",
          padding: 12,
          borderRadius: 10,
          fontSize: 16,
          marginBottom: 20,
        }}
        autoCapitalize="none"
      />

      <TouchableOpacity
        disabled={loading}
        onPress={handleSignup}
        style={{
          backgroundColor: loading ? "#9CA3AF" : "#111827",
          paddingVertical: 14,
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "600" }}>
            Continue
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // -------------------------------
  // MAIN RENDER
  // -------------------------------
  if (checkingLogin) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return merchantId ? <LoggedInDashboard /> : <SignupUI />;
}

// -------------------------------
// STYLES
// -------------------------------
const cardStyle = {
  backgroundColor: "#F3F4F6",
  padding: 20,
  borderRadius: 15,
  marginBottom: 20,
};



const cardDesc = {
  fontSize: 14,
  color: "#6B7280",
};
