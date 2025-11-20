// app/index.tsx
import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState("/signup");

  useEffect(() => {
    async function check() {
      const merchant_id = await AsyncStorage.getItem("merchant_id");
      const pinCreated = await AsyncStorage.getItem("pin_created");

      if (!merchant_id) {
        setRoute("/signup");
      } else {
        setRoute("/pin-login");
      }

      setReady(true);
    }
    check();
  }, []);
  

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href={route} />;
}

