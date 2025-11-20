import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert, TouchableOpacity, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const BACKEND_URL = "https://joelsapos.com/taptopay";

export default function PinLogin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyPin = async () => {
    if (loading) return;
    setLoading(true);

    if (!/^\d{6}$/.test(pin)) {
      Alert.alert("PIN must be exactly 6 digits");
      setLoading(false);
      return;
    }

    const merchant_id = await AsyncStorage.getItem("merchant_id");

    const res = await fetch(`${BACKEND_URL}/verify_pin.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id, pin }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) {
      router.replace("/(tabs)");
    } else {
      Alert.alert("Incorrect PIN", "If this continues, try clearing cache below.");
    }
  };

  const clearCache = async () => {
    await AsyncStorage.clear();
    Alert.alert(
      "Cache Cleared",
      "You can now log in again with your email and set up your PIN."
    );
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


      <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 20 }}>
        Enter PIN
      </Text>

      <TextInput
        placeholder="••••••"
        value={pin}
        onChangeText={setPin}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
        style={{
          fontSize: 28,
          textAlign: "center",
          borderWidth: 1,
          padding: 15,
          borderRadius: 12,
          letterSpacing: 10,
          marginBottom: 20,
        }}
      />

      <Button
        title={loading ? "Checking..." : "Unlock"}
        onPress={verifyPin}
      />

      {/* Info Text */}
      <Text style={{ marginTop: 30, color: "#6B7280", textAlign: "center" }}>
        If your PIN does not work even when correct, you may need to clear cache
        and log in again with your email.
      </Text>

      {/* Clear Cache Button */}
      <TouchableOpacity
        onPress={clearCache}
        style={{
          marginTop: 20,
          backgroundColor: "#DC2626",
          paddingVertical: 14,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontSize: 16, fontWeight: "600" }}>
          Clear Cache
        </Text>
      </TouchableOpacity>
    </View>
  );
}
