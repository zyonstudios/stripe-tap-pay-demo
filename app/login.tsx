import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKEND_URL = "https://joelsapos.com/taptopay";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");

  const handleLogin = async () => {
    if (!email.includes("@")) {
      Alert.alert("Invalid email");
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      Alert.alert("PIN must be exactly 6 digits");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, user_pin: pin }),
      });

      const text = await res.text();
      console.log("LOGIN RESPONSE:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        Alert.alert("Server Error", "Invalid JSON from login.php");
        return;
      }

      if (data.error) {
        Alert.alert("Login Failed", data.error);
        return;
      }

      // Save login session
      await AsyncStorage.setItem("merchant_id", String(data.merchant_id));
      await AsyncStorage.setItem("stripe_account_id", data.account_id ?? "");
      await AsyncStorage.setItem("onboarding_complete", data.onboarding_complete);

      if (data.onboarding_complete === "true") {
        router.replace("/(tabs)");
      } else {
        router.replace("/onboard");
      }
    } catch (err: any) {
      Alert.alert("Network Error", err.message ?? "Request failed");
    }
  };

  return (
    <View style={{ padding: 20, marginTop: 80 }}>

      {/* TapToPay Logo */}
<View style={{ alignItems: "center", marginBottom: 25 }}>
  <Image
    source={require("../assets/taptopay.png")}
    style={{
      width: "60%",
      height: undefined,
      aspectRatio: 1, // keeps it square
    }}
    resizeMode="contain"
  />
</View>


      <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 20 }}>
        Login to your account
      </Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          borderWidth: 1,
          padding: 10,
          borderRadius: 8,
          marginBottom: 20,
        }}
      />

      <TextInput
        placeholder="Enter your 6-digit PIN"
        value={pin}
        onChangeText={setPin}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
        style={{
          borderWidth: 1,
          padding: 10,
          borderRadius: 8,
          marginBottom: 20,
        }}
      />

      <Button title="Login" onPress={handleLogin} />

      <View style={{ marginTop: 20 }}>
        <Button
          title="Create a new account"
          onPress={() => router.push("/signup")}
        />
      </View>
    </View>
  );
}

