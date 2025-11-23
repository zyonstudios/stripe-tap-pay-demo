import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const BACKEND_URL = "";

// Currency options user is allowed to change
const CURRENCIES = ["GBP", "USD", "EUR", "CAD", "AUD", "SGD"];

export default function SettingsScreen() {
  const router = useRouter();
  const [currency, setCurrency] = useState("GBP");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const savedCurrency = await AsyncStorage.getItem("merchant_currency");
    setCurrency(savedCurrency ?? "GBP");
  };

  const saveCurrency = async (newCurrency: string) => {

    setCurrency(newCurrency);

    await AsyncStorage.setItem("merchant_currency", newCurrency);

    const merchant_id = await AsyncStorage.getItem("merchant_id");

    await fetch(`${BACKEND_URL}/update_currency_only.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id,
        currency: newCurrency,
      }),
    });

    Alert.alert("Saved", `Currency updated to ${newCurrency}`);
  };

  return (
    <View style={{ padding: 20, marginTop: 60 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Settings</Text>

      {/* Currency Selection */}
      <Text style={{ marginTop: 20, marginBottom: 5, fontSize: 18 }}>
        Transaction Currency
      </Text>

      {CURRENCIES.map((c) => (
        <TouchableOpacity
          key={c}
          onPress={() => saveCurrency(c)}
          style={{
            padding: 12,
            backgroundColor: currency === c ? "#111" : "#eee",
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          <Text
            style={{
              color: currency === c ? "#fff" : "#000",
              fontSize: 16,
            }}
          >
            {c}
          </Text>
        </TouchableOpacity>
      ))}

      <Text style={{ marginTop: 20, fontSize: 18 }}>Current Currency</Text>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>{currency}</Text>

      {/* 🔙 Back to Dashboard Button */}
      <TouchableOpacity
        onPress={() => router.push("/(tabs)")}
        style={{
          marginTop: 40,
          padding: 15,
          backgroundColor: "#111827",
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
          Back to Dashboard
        </Text>
      </TouchableOpacity>
    </View>
  );
}

